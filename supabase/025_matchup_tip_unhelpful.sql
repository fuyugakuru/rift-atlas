begin;
alter table public.matchup_tip_votes add column if not exists rating smallint not null default 1 check(rating in(-1,1));
create or replace function public.rate_matchup_tip(p_tip uuid,p_rating integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();owner_id uuid;
begin
 if me is null then raise exception 'Sign in required';end if;
 if p_rating is null or p_rating not in(-1,0,1) then raise exception 'Invalid rating';end if;
 select user_id into owner_id from public.matchup_tips where id=p_tip and deleted_at is null for share;
 if owner_id is null then raise exception 'Tip not found';end if;
 if owner_id=me then raise exception 'Cannot vote for own tip';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,24));
 if p_rating=0 then delete from public.matchup_tip_votes where tip_id=p_tip and user_id=me;
 else insert into public.matchup_tip_votes(tip_id,user_id,rating) values(p_tip,me,p_rating) on conflict(tip_id,user_id) do update set rating=excluded.rating;end if;
 return jsonb_build_object('useful_count',(select count(*) from public.matchup_tip_votes where tip_id=p_tip and rating=1),'unhelpful_count',(select count(*) from public.matchup_tip_votes where tip_id=p_tip and rating=-1),'my_rating',nullif(p_rating,0),'my_vote',p_rating=1);
end $$;
revoke all on function public.rate_matchup_tip(uuid,integer) from public,anon,authenticated;
grant execute on function public.rate_matchup_tip(uuid,integer) to authenticated;
-- Keep the already published positive-vote client compatible.
create or replace function public.vote_matchup_tip(p_tip uuid,p_useful boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_useful is null then raise exception 'Invalid vote';end if;
 return public.rate_matchup_tip(p_tip,case when p_useful then 1 else 0 end);
end $$;
create or replace function public.matchup_community(p_champion text,p_opponent text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at integer:=least(greatest(coalesce(p_offset,0),0),1000);
begin
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 return jsonb_build_object(
 'tips',coalesce((select jsonb_agg(to_jsonb(t)) from(select t.id,t.body,t.patch,t.updated_at,t.category,
 (select count(*) from public.matchup_tip_votes v where v.tip_id=t.id and v.rating=1) as useful_count,
 (select count(*) from public.matchup_tip_votes v where v.tip_id=t.id and v.rating=-1) as unhelpful_count,
 (select rating from public.matchup_tip_votes v where v.tip_id=t.id and v.user_id=auth.uid()) as my_rating,
 exists(select 1 from public.matchup_tip_votes v where v.tip_id=t.id and v.user_id=auth.uid() and v.rating=1) as my_vote,
 (t.user_id=auth.uid()) as is_own,
 jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar) as author
 from public.matchup_tips t join public.profiles p on p.id=t.user_id
 where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null
 order by (select coalesce(sum(v.rating),0) from public.matchup_tip_votes v where v.tip_id=t.id) desc,(t.patch=p_patch) desc,t.updated_at desc,t.id limit 20 offset start_at) t),'[]'::jsonb),
 'has_more',(select count(*)>start_at+20 from public.matchup_tips t join public.profiles p on p.id=t.user_id where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null),
 'own_category',(select category from public.matchup_tips where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'own_tip',(select body from public.matchup_tips where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'my_results',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,won,played_at,rank,status,review_note from public.matchup_results where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null order by played_at desc limit 10) t),'[]'::jsonb));
end $$;
revoke all on function public.matchup_community(text,text,text,text,integer) from public;
grant execute on function public.matchup_community(text,text,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
