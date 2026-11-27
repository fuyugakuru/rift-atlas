begin;
-- Save and read the authoritative result in one round trip, not two.
create function public.rate_community_tier(p_champion text,p_lane text,p_rank text,p_patch text,p_tier integer,p_list_rank text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_tier is null then perform public.remove_tier_vote(p_champion,p_lane,p_patch);
 else perform public.save_tier_vote(p_champion,p_lane,p_rank,p_patch,p_tier);end if;
 return jsonb_build_object('list',public.community_tier_list(p_lane,p_list_rank,p_patch),'my_votes',public.my_tier_votes(p_lane,p_patch));
end $$;
-- Public advice never waits for login/session refresh or personal match reports.
create function public.matchup_tips_public(p_champion text,p_opponent text,p_lane text,p_patch text,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at integer:=least(greatest(coalesce(p_offset,0),0),1000);
begin
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 return (with candidates as materialized(
 select t.id,t.body,t.patch,t.updated_at,t.category,t.user_id,p.public_id,p.nickname,p.avatar,
 coalesce(v.useful_count,0) useful_count,coalesce(v.unhelpful_count,0) unhelpful_count,coalesce(v.score,0) score
 from public.matchup_tips t join public.profiles p on p.id=t.user_id
 left join lateral(select count(*) filter(where rating=1) useful_count,count(*) filter(where rating=-1) unhelpful_count,sum(rating) score from public.matchup_tip_votes where tip_id=t.id)v on true
 where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null and not t.moderation_hidden
 ), page as(select * from candidates order by score desc,(patch=p_patch) desc,updated_at desc,id limit 20 offset start_at)
 select jsonb_build_object('tips',coalesce((select jsonb_agg(jsonb_build_object('id',id,'body',body,'patch',patch,'updated_at',updated_at,'category',category,'useful_count',useful_count,'unhelpful_count',unhelpful_count,'staff_note',public.staff_note_payload('tip',id),'author',jsonb_build_object('id',public_id,'nickname',nickname,'avatar',avatar)) order by score desc,(patch=p_patch) desc,updated_at desc,id) from page),'[]'::jsonb),'has_more',(select count(*)>start_at+20 from candidates)));
end $$;
create function public.matchup_tip_personal(p_champion text,p_opponent text,p_lane text,p_patch text,p_tip_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();
begin
 if me is null then raise exception 'Sign in required';end if;
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 if cardinality(p_tip_ids)>100 then raise exception 'Too many tips';end if;
 return jsonb_build_object(
 'own_tip',(select body from public.matchup_tips where user_id=me and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null and not moderation_hidden),
 'own_category',(select category from public.matchup_tips where user_id=me and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null and not moderation_hidden),
 'ratings',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'my_rating',v.rating,'is_own',t.user_id=me)) from public.matchup_tips t left join public.matchup_tip_votes v on v.tip_id=t.id and v.user_id=me where t.id=any(p_tip_ids) and t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null and not t.moderation_hidden),'[]'::jsonb));
end $$;
revoke all on function public.rate_community_tier(text,text,text,text,integer,text),public.matchup_tips_public(text,text,text,text,integer),public.matchup_tip_personal(text,text,text,text,uuid[]) from public,anon,authenticated;
grant execute on function public.matchup_tips_public(text,text,text,text,integer) to anon,authenticated;
grant execute on function public.rate_community_tier(text,text,text,text,integer,text),public.matchup_tip_personal(text,text,text,text,uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
