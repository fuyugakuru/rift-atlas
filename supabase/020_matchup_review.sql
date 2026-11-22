begin;
create table public.matchup_reviewers(user_id uuid primary key references auth.users(id));
alter table public.matchup_reviewers enable row level security;
revoke all on public.matchup_reviewers from public,anon,authenticated;
create function public.is_matchup_reviewer() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.matchup_reviewers where user_id=auth.uid())$$;
revoke all on function public.is_matchup_reviewer() from public,anon;
grant execute on function public.is_matchup_reviewer() to authenticated;
alter table public.matchup_results add column screenshot_path text,add column status text not null default 'pending' check(status in('pending','approved','rejected')),add column review_note text,add column reviewed_at timestamptz;
create unique index matchup_result_proof_once on public.matchup_results(screenshot_path) where screenshot_path is not null;
create table public.matchup_uploads(path text primary key,user_id uuid not null references auth.users(id),created_at timestamptz not null default now(),used boolean not null default false);
alter table public.matchup_uploads enable row level security;
revoke all on public.matchup_uploads from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('matchup-proof','matchup-proof',false,3145728,array['image/jpeg','image/png','image/webp']);
create function public.prepare_matchup_upload() returns text language plpgsql security definer set search_path='' as $$declare me uuid:=auth.uid();p text;begin
if me is null then raise exception 'Sign in required';end if;
perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,19));
if(select count(*) from public.matchup_uploads where user_id=me and created_at>now()-interval '1 day')>=20 then raise exception 'Daily limit reached';end if;
p:=me::text||'/'||gen_random_uuid()::text||'.jpg';insert into public.matchup_uploads(path,user_id) values(p,me);return p;end $$;
create function public.can_upload_matchup_proof(p_path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.matchup_uploads where path=p_path and user_id=auth.uid() and not used and created_at>now()-interval '1 hour')$$;
revoke all on function public.prepare_matchup_upload(),public.can_upload_matchup_proof(text) from public,anon;
grant execute on function public.prepare_matchup_upload(),public.can_upload_matchup_proof(text) to authenticated;
create policy matchup_proof_insert on storage.objects for insert to authenticated with check(bucket_id='matchup-proof' and public.can_upload_matchup_proof(name));
create policy matchup_proof_read on storage.objects for select to authenticated using(bucket_id='matchup-proof' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_matchup_reviewer()));
drop function public.submit_matchup_result(text,text,text,text,text,boolean,timestamptz);
create or replace function public.submit_matchup_result(p_champion text,p_opponent text,p_lane text,p_patch text,p_rank text,p_won boolean,p_played_at timestamptz,p_screenshot text)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();played timestamptz:=date_trunc('minute',p_played_at);result uuid;
begin
 if me is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,19));
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 if not exists(select 1 from public.matchup_uploads u join storage.objects o on o.bucket_id='matchup-proof' and o.name=u.path where u.path=p_screenshot and u.user_id=me and u.used=false and u.created_at>now()-interval '1 hour') then raise exception 'Screenshot required';end if;
 if p_rank is null or p_rank not in('diamond','master','grandmaster','challenger','sovereign') or p_won is null or played is null or played>now()+interval '5 minutes' or played<now()-interval '30 days' then raise exception 'Invalid match result';end if;
 if exists(select 1 from public.matchup_results where user_id=me and played_at=played and deleted_at is null) then raise exception 'Duplicate match result';end if;
 if (select count(*) from public.matchup_results where user_id=me and created_at>now()-interval '1 day')>=20 then raise exception 'Daily limit reached';end if;
 insert into public.matchup_results(user_id,champion,opponent,lane,patch,rank,won,played_at,screenshot_path,status) values(me,p_champion,p_opponent,p_lane,p_patch,p_rank,p_won,played,p_screenshot,'pending')
 on conflict(user_id,played_at) do update set champion=excluded.champion,opponent=excluded.opponent,lane=excluded.lane,patch=excluded.patch,rank=excluded.rank,won=excluded.won,deleted_at=null,screenshot_path=excluded.screenshot_path,status='pending',review_note=null,reviewed_at=null returning id into result;update public.matchup_uploads set used=true where path=p_screenshot;return result;
end $$;

create or replace function public.community_matchup_stats(p_champion text,p_lane text,p_patch text,p_rank text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if p_rank is null or p_rank not in('all','diamond','master','grandmaster','challenger','sovereign') then raise exception 'Invalid rank';end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(s)) from (
 select opponent,count(*) as reports,count(*) filter(where won) as wins,count(*) filter(where not won) as losses,count(distinct user_id) as players,
 round(100.0*count(*) filter(where won)/count(*),4) as win from public.matchup_results where champion=p_champion and lane=p_lane and patch=p_patch and deleted_at is null and status='approved' and (p_rank='all' or rank=p_rank) group by opponent) s),'[]'::jsonb));
end $$;

create or replace function public.matchup_community(p_champion text,p_opponent text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at integer:=least(greatest(coalesce(p_offset,0),0),1000);
begin
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 return jsonb_build_object(
 'tips',coalesce((select jsonb_agg(to_jsonb(t)) from(select t.id,t.body,t.updated_at,
 jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar) as author from public.matchup_tips t join public.profiles p on p.id=t.user_id
 where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.patch=p_patch and t.deleted_at is null order by t.updated_at desc,t.id limit 20 offset start_at) t),'[]'::jsonb),
 'has_more',(select count(*)>start_at+20 from public.matchup_tips where champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'own_tip',(select body from public.matchup_tips where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'my_results',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,won,played_at,rank,status,review_note from public.matchup_results where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null order by played_at desc limit 10) t),'[]'::jsonb));
end $$;

create function public.matchup_review_queue(p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
if not public.is_matchup_reviewer() then raise exception 'Reviewer required';end if;
return coalesce((select jsonb_agg(to_jsonb(q)) from(select r.id,r.champion,r.opponent,r.lane,r.patch,r.rank,r.won,r.played_at,r.screenshot_path,p.nickname from public.matchup_results r join public.profiles p on p.id=r.user_id where r.status='pending' and r.deleted_at is null order by r.created_at,r.id limit 20 offset least(greatest(coalesce(p_offset,0),0),10000))q),'[]'::jsonb);end $$;
create function public.review_matchup_result(p_id uuid,p_approve boolean,p_note text default '') returns boolean language plpgsql security definer set search_path='' as $$begin
if not public.is_matchup_reviewer() then raise exception 'Reviewer required';end if;
if p_approve is null or char_length(coalesce(p_note,''))>300 then raise exception 'Invalid review';end if;
update public.matchup_results set status=case when p_approve then 'approved' else 'rejected' end,review_note=left(coalesce(p_note,''),300),reviewed_at=now() where id=p_id and status='pending' and deleted_at is null and (not p_approve or screenshot_path is not null);return found;end $$;
revoke all on function public.submit_matchup_result(text,text,text,text,text,boolean,timestamptz,text),public.matchup_review_queue(integer),public.review_matchup_result(uuid,boolean,text) from public,anon;
grant execute on function public.submit_matchup_result(text,text,text,text,text,boolean,timestamptz,text),public.matchup_review_queue(integer),public.review_matchup_result(uuid,boolean,text) to authenticated;
create function public.matchup_reviewer_badge(p_public_id uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.matchup_reviewers r join public.profiles p on p.id=r.user_id where p.public_id=p_public_id)$$;
revoke all on function public.matchup_reviewer_badge(uuid) from public;
grant execute on function public.matchup_reviewer_badge(uuid) to anon,authenticated;
notify pgrst,'reload schema';commit;
