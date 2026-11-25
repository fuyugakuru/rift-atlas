begin;
-- Advice survives patch updates. Reports and the editable own tip remain patch-specific.
create or replace function public.matchup_community(p_champion text,p_opponent text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at integer:=least(greatest(coalesce(p_offset,0),0),1000);
begin
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 return jsonb_build_object(
 'tips',coalesce((select jsonb_agg(to_jsonb(t)) from(select t.id,t.body,t.patch,t.updated_at,
 jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar) as author
 from public.matchup_tips t join public.profiles p on p.id=t.user_id
 where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null
 order by (t.patch=p_patch) desc,t.updated_at desc,t.id limit 20 offset start_at) t),'[]'::jsonb),
 'has_more',(select count(*)>start_at+20 from public.matchup_tips t join public.profiles p on p.id=t.user_id where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.deleted_at is null),
 'own_tip',(select body from public.matchup_tips where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'my_results',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,won,played_at,rank,status,review_note from public.matchup_results where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null order by played_at desc limit 10) t),'[]'::jsonb));
end $$;
revoke all on function public.matchup_community(text,text,text,text,integer) from public;
grant execute on function public.matchup_community(text,text,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
