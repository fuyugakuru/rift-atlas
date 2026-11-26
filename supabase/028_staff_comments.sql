begin;
create table public.site_staff_notes(kind text not null check(kind in('tip','build')),target_id uuid not null,body text not null check(char_length(body)<=600),actor_id uuid not null references auth.users(id),actor_role text not null check(actor_role in('admin','moderator')),content_version timestamptz not null,updated_at timestamptz not null default now(),primary key(kind,target_id));
alter table public.site_staff_notes enable row level security;
revoke all on public.site_staff_notes from public,anon,authenticated;
create function public.staff_note_payload(p_kind text,p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('body',n.body,'role',n.actor_role,'author',p.nickname,'profile_id',p.public_id,'updated_at',n.updated_at,'outdated',n.content_version is distinct from case when n.kind='tip' then (select updated_at from public.matchup_tips where id=n.target_id) else (select updated_at from public.player_builds where moderation_id=n.target_id) end)
 from public.site_staff_notes n join public.profiles p on p.id=n.actor_id where n.kind=p_kind and n.target_id=p_id
$$;
revoke all on function public.staff_note_payload(text,uuid) from public,anon,authenticated;
create function public.staff_set_note(p_kind text,p_id uuid,p_body text,p_version timestamptz,p_note_version timestamptz default null) returns boolean language plpgsql security definer set search_path='' as $$
declare text_body text:=btrim(coalesce(p_body,''));content jsonb;note_time timestamptz;staff_role text;
begin
 perform public.require_site_staff();staff_role:=public.site_staff_role();
 if p_kind is null or p_kind not in('tip','build') or char_length(text_body)>600 or (text_body<>'' and char_length(text_body)<3) or p_version is null then raise exception 'Invalid staff comment';end if;
 if p_kind='tip' then select to_jsonb(t) into content from public.matchup_tips t where id=p_id and deleted_at is null for share;
 else select to_jsonb(b) into content from public.player_builds b where moderation_id=p_id for share;end if;
 if content is null then raise exception 'Content no longer exists';end if;
 if (content->>'updated_at')::timestamptz<>p_version then raise exception 'Content changed. Refresh first';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_kind||p_id::text,28));
 select updated_at into note_time from public.site_staff_notes where kind=p_kind and target_id=p_id;
 if note_time is distinct from p_note_version then raise exception 'Content changed. Refresh first';end if;
 if text_body='' and note_time is null then return false;end if;
 insert into public.site_staff_notes(kind,target_id,body,actor_id,actor_role,content_version) values(p_kind,p_id,text_body,auth.uid(),staff_role,p_version)
 on conflict(kind,target_id) do update set body=excluded.body,actor_id=excluded.actor_id,actor_role=excluded.actor_role,content_version=excluded.content_version,updated_at=clock_timestamp();
 insert into public.site_moderation_log(actor_id,kind,target_id,action,snapshot) values(auth.uid(),p_kind,p_id::text,case when text_body='' then 'remove_note' else 'note' end,jsonb_build_object('champion',coalesce(content->>'champion',content->>'champion_id'),'opponent',content->>'opponent','body',text_body));return true;
end $$;
revoke all on function public.staff_set_note(text,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.staff_set_note(text,uuid,text,timestamptz,timestamptz) to authenticated;
create function public.my_build_staff_notes(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_ids is null or cardinality(p_ids)>20 then raise exception 'Invalid request';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',b.moderation_id,'note',public.staff_note_payload('build',b.moderation_id))) from public.player_builds b where b.user_id=auth.uid() and b.moderation_id=any(p_ids)),'[]'::jsonb);
end $$;
revoke all on function public.my_build_staff_notes(uuid[]) from public,anon,authenticated;
grant execute on function public.my_build_staff_notes(uuid[]) to authenticated;
-- Enrich existing read APIs without replacing their filtering or permissions.
do $$declare definition text;begin
 select pg_get_functiondef('public.staff_content(text,text,text,text,integer)'::regprocedure) into definition;
 definition:=replace(definition,'''hidden'',hidden,','''staff_note'',public.staff_note_payload(kind,id),''hidden'',hidden,');execute definition;
 select pg_get_functiondef('public.matchup_community(text,text,text,text,integer)'::regprocedure) into definition;
 definition:=replace(definition,'t.id,t.body,','t.id,public.staff_note_payload(''tip'',t.id) as staff_note,t.body,');execute definition;
 select pg_get_functiondef('public.list_community_builds(text,text,text,integer)'::regprocedure) into definition;
 definition:=replace(definition,'select b.title,b.description,','select public.staff_note_payload(''build'',b.moderation_id) as staff_note,b.title,b.description,');
 definition:=replace(definition,'''description'',description)', '''description'',description,''staff_note'',staff_note)');execute definition;
 select pg_get_functiondef('public.public_player_builds(uuid,integer)'::regprocedure) into definition;
 definition:=replace(definition,'''description'',description)', '''description'',description,''staff_note'',public.staff_note_payload(''build'',moderation_id))');execute definition;
 select pg_get_functiondef('public.my_saved_builds(integer)'::regprocedure) into definition;
 definition:=replace(definition,'select b.champion_id,b.lane,','select public.staff_note_payload(''build'',b.moderation_id) as staff_note,b.champion_id,b.lane,');execute definition;
end $$;
notify pgrst,'reload schema';
commit;
