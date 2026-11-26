begin;
create table public.site_staff(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in('admin','moderator')),created_at timestamptz not null default now());
alter table public.site_staff enable row level security;
revoke all on public.site_staff from public,anon,authenticated;
create function public.site_staff_role() returns text language sql stable security definer set search_path='' as $$select role from public.site_staff where user_id=auth.uid()$$;
revoke all on function public.site_staff_role() from public,anon;
grant execute on function public.site_staff_role() to authenticated;
create function public.require_site_staff(p_admin boolean default false) returns void language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or public.site_staff_role() is null or (p_admin and public.site_staff_role()<>'admin') then raise exception 'Staff access required';end if;
end $$;
revoke all on function public.require_site_staff(boolean) from public,anon,authenticated;
alter table public.matchup_tips add column moderation_hidden boolean not null default false,add column moderation_reason text not null default '';
alter table public.player_builds add column moderation_id uuid not null default gen_random_uuid(),add column moderation_hidden boolean not null default false,add column moderation_reason text not null default '';
create unique index player_builds_moderation_id on public.player_builds(moderation_id);
create table public.site_moderation_log(id uuid primary key default gen_random_uuid(),actor_id uuid not null references auth.users(id),kind text not null check(kind in('tip','build','staff')),target_id text not null,action text not null,reason text not null default '',snapshot jsonb not null default '{}',created_at timestamptz not null default now());
alter table public.site_moderation_log enable row level security;
revoke all on public.site_moderation_log from public,anon,authenticated;
create function public.guard_moderation_fields() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' then
  if new.moderation_hidden or new.moderation_reason<>'' then raise exception 'Moderation fields are protected';end if;
 else
  if (new.moderation_hidden is distinct from old.moderation_hidden or new.moderation_reason is distinct from old.moderation_reason) and (coalesce(current_setting('rift.moderation_action',true),'')<>'yes' or public.site_staff_role() is null) then raise exception 'Moderation fields are protected';end if;
  if tg_table_name='player_builds' and to_jsonb(new)->>'moderation_id' is distinct from to_jsonb(old)->>'moderation_id' then raise exception 'Moderation ID is immutable';end if;
 end if;return new;
end $$;
revoke all on function public.guard_moderation_fields() from public,anon,authenticated;
create trigger guard_moderation_fields before insert or update on public.matchup_tips for each row execute function public.guard_moderation_fields();
create trigger guard_moderation_fields before insert or update on public.player_builds for each row execute function public.guard_moderation_fields();
do $$declare definition text;begin
 select pg_get_functiondef('public.validate_player_build()'::regprocedure) into definition;
 definition:=regexp_replace(definition,'\mbegin\M', 'begin
 if tg_op=''UPDATE'' and coalesce(current_setting(''rift.moderation_action'',true),'''')=''yes'' and public.site_staff_role() is not null and (to_jsonb(new)-''moderation_hidden''-''moderation_reason'')=(to_jsonb(old)-''moderation_hidden''-''moderation_reason'') then return new;end if;','i');
 execute definition;
end $$;
-- Read-only internal view keeps hidden builds out of public lists and popularity statistics.
create view public.visible_player_builds with(security_barrier=true) as select * from public.player_builds where not moderation_hidden;
revoke all on public.visible_player_builds from public,anon,authenticated;
do $$declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in('build_item_popularity','build_community_stats','public_player_builds','list_community_builds','my_saved_builds','build_engagement','public_player_profile') loop
  definition:=pg_get_functiondef(f.oid);definition:=replace(definition,'public.player_builds','public.visible_player_builds');execute definition;
 end loop;
 -- Keep the current voting/category API intact while excluding hidden advice.
 select pg_get_functiondef('public.matchup_community(text,text,text,text,integer)'::regprocedure) into definition;
 definition:=replace(definition,'t.deleted_at is null','t.deleted_at is null and not t.moderation_hidden');execute definition;
end $$;
create or replace function public.is_matchup_reviewer() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.matchup_reviewers where user_id=auth.uid()) or exists(select 1 from public.site_staff where user_id=auth.uid())$$;
create function public.staff_content(p_kind text default 'tip',p_status text default 'visible',p_query text default '',p_champion text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;start_at integer:=least(greatest(coalesce(p_offset,0),0),10000);needle text:=left(lower(btrim(coalesce(p_query,''))),100);
begin
 perform public.require_site_staff();
 if p_kind is null or p_kind not in('tip','build') or p_status is null or p_status not in('all','visible','hidden') then raise exception 'Invalid filter';end if;
 with content as(
 select 'tip' kind,t.id,t.champion,t.opponent,t.lane,t.patch,t.body,''::text title,t.category,t.updated_at,t.moderation_hidden hidden,t.moderation_reason reason,t.user_id,'[]'::jsonb items,'[]'::jsonb runes,'[]'::jsonb spells from public.matchup_tips t where t.deleted_at is null and p_kind='tip'
 union all
 select 'build',b.moderation_id,b.champion_id,null,b.lane,b.patch,b.description,b.title,'general',b.updated_at,b.moderation_hidden,b.moderation_reason,b.user_id,to_jsonb(b.items),to_jsonb(b.runes),to_jsonb(b.spells) from public.player_builds b where p_kind='build'
 ),chosen as(select x.*,p.public_id,p.nickname,p.avatar from content x join public.profiles p on p.id=x.user_id
 where (p_status='all' or x.hidden=(p_status='hidden')) and (coalesce(p_champion,'')='' or x.champion=p_champion) and (needle='' or strpos(lower(p.nickname||' '||x.body||' '||x.title||' '||x.champion||' '||coalesce(x.opponent,'')),needle)>0)),page as(select * from chosen order by updated_at desc,id limit 20 offset start_at)
 select jsonb_build_object('total',(select count(*) from chosen),'has_more',(select count(*) from chosen)>start_at+20,'rows',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',id,'champion',champion,'opponent',opponent,'lane',lane,'patch',patch,'body',body,'title',title,'category',category,'updated_at',updated_at,'hidden',hidden,'reason',reason,'items',items,'runes',runes,'spells',spells,'author',jsonb_build_object('id',public_id,'nickname',nickname,'avatar',avatar)) order by updated_at desc,id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
create function public.staff_overview() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_site_staff();return jsonb_build_object('role',public.site_staff_role(),'tips',(select count(*) from public.matchup_tips where deleted_at is null and not moderation_hidden),'builds',(select count(*) from public.player_builds where not moderation_hidden),'hidden_tips',(select count(*) from public.matchup_tips where deleted_at is null and moderation_hidden),'hidden_builds',(select count(*) from public.player_builds where moderation_hidden),'pending_results',(select count(*) from public.matchup_results where deleted_at is null and status='pending'));
end $$;
create function public.staff_moderate(p_kind text,p_id uuid,p_hidden boolean,p_reason text,p_version timestamptz) returns boolean language plpgsql security definer set search_path='' as $$
declare content jsonb;reason_text text:=btrim(coalesce(p_reason,''));begin
 perform public.require_site_staff();if p_kind is null or p_kind not in('tip','build') or p_hidden is null or p_version is null or char_length(reason_text)>300 or (p_hidden and char_length(reason_text)<3) then raise exception 'Specify reason';end if;
 if p_kind='tip' then select to_jsonb(t) into content from public.matchup_tips t where id=p_id and deleted_at is null for update;
 else select to_jsonb(b) into content from public.player_builds b where moderation_id=p_id for update;end if;
 if content is null then raise exception 'Content no longer exists';end if;
 if (content->>'updated_at')::timestamptz<>p_version then raise exception 'Content changed. Refresh first';end if;
 if (content->>'moderation_hidden')::boolean=p_hidden then return false;end if;
 perform set_config('rift.moderation_action','yes',true);
 if p_kind='tip' then update public.matchup_tips set moderation_hidden=p_hidden,moderation_reason=case when p_hidden then reason_text else '' end where id=p_id;
 else update public.player_builds set moderation_hidden=p_hidden,moderation_reason=case when p_hidden then reason_text else '' end where moderation_id=p_id;end if;
 perform set_config('rift.moderation_action','no',true);
 insert into public.site_moderation_log(actor_id,kind,target_id,action,reason,snapshot) values(auth.uid(),p_kind,p_id::text,case when p_hidden then 'hide' else 'restore' end,reason_text,content- 'user_id');return true;
end $$;
create function public.staff_history(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_site_staff();return coalesce((select jsonb_agg(to_jsonb(x)) from(select l.id,l.kind,l.target_id,l.action,l.reason,l.created_at,l.snapshot,p.nickname actor,p.public_id actor_profile from public.site_moderation_log l left join public.profiles p on p.id=l.actor_id order by l.created_at desc,l.id limit 20 offset least(greatest(coalesce(p_offset,0),0),10000))x),'[]'::jsonb);
end $$;
create function public.staff_team() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_site_staff(true);return coalesce((select jsonb_agg(jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar,'role',s.role) order by s.role,p.nickname) from public.site_staff s join public.profiles p on p.id=s.user_id),'[]'::jsonb);
end $$;
create function public.staff_set_moderator(p_profile uuid,p_enabled boolean) returns boolean language plpgsql security definer set search_path='' as $$declare target uuid;begin
 perform public.require_site_staff(true);if p_enabled is null then raise exception 'Invalid role';end if;
 perform pg_advisory_xact_lock(26001);
 select id into target from public.profiles where public_id=p_profile;if target is null then raise exception 'Player not found';end if;
 if exists(select 1 from public.site_staff where user_id=target and role='admin') then raise exception 'Administrator role is protected';end if;
 if p_enabled then insert into public.site_staff(user_id,role) values(target,'moderator') on conflict(user_id) do nothing;
 else delete from public.site_staff where user_id=target and role='moderator';end if;
 insert into public.site_moderation_log(actor_id,kind,target_id,action,reason) values(auth.uid(),'staff',p_profile::text,case when p_enabled then 'grant_moderator' else 'revoke_moderator' end,'');return true;
end $$;
create function public.public_staff_badge(p_profile uuid) returns text language sql stable security definer set search_path='' as $$select s.role from public.site_staff s join public.profiles p on p.id=s.user_id where p.public_id=p_profile$$;
revoke all on function public.staff_content(text,text,text,text,integer),public.staff_overview(),public.staff_moderate(text,uuid,boolean,text,timestamptz),public.staff_history(integer),public.staff_team(),public.staff_set_moderator(uuid,boolean) from public,anon,authenticated;
grant execute on function public.staff_content(text,text,text,text,integer),public.staff_overview(),public.staff_moderate(text,uuid,boolean,text,timestamptz),public.staff_history(integer),public.staff_team(),public.staff_set_moderator(uuid,boolean) to authenticated;
revoke all on function public.public_staff_badge(uuid) from public;
grant execute on function public.public_staff_badge(uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;

