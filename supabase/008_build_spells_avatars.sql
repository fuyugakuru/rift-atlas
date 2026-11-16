begin;
alter table public.player_builds add column if not exists spells text[] not null default '{}';
alter table public.player_builds add constraint player_builds_spells_valid check (cardinality(spells)=0 or (cardinality(spells)=2 and spells[1] is not null and spells[2] is not null and spells[1]<>spells[2] and spells <@ ARRAY['spell:Flash','spell:Ignite','spell:Smite','spell:Barrier','spell:Heal','spell:Ghost','spell:Teleport']::text[]));
create or replace function public.list_community_builds(p_champion text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with selected as (
 select b.items,b.runes,b.spells,b.updated_at,b.user_id,coalesce(p.nickname,'Игрок') nickname,coalesce(p.avatar,'mel') avatar
 from public.player_builds b left join public.profiles p on p.id=b.user_id
 where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch
), page as (select * from selected order by updated_at desc,user_id offset greatest(coalesce(p_offset,0),0) limit 12)
select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+12,
'builds',coalesce((select jsonb_agg(jsonb_build_object('nickname',nickname,'avatar',avatar,'spells',spells,'items',items,'runes',runes,'updated_at',updated_at) order by updated_at desc,user_id) from page),'[]'::jsonb));
$$;
revoke all on function public.list_community_builds(text,text,text,integer) from public;
grant execute on function public.list_community_builds(text,text,text,integer) to anon,authenticated;
commit;
