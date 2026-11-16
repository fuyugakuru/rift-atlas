-- Публичная статистика: только агрегаты, без идентификаторов игроков.
begin;
create or replace function public.build_community_stats(p_champion text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with selected as (
 select array(select case x when 'item:Spellslinger''s Shoes' then 'item:Boots of Mana'
when 'item:Chainlaced Crushers' then 'item:Mercury''s Treads'
when 'item:Gunmetal Greaves' then 'item:Berserker''s Greaves'
when 'item:Armored Advance' then 'item:Plated Steelcaps'
when 'item:Immortal Boots' then 'item:Gluttonous Greaves'
when 'item:Armorcrusher Boots' then 'item:Boots of Dynamism'
when 'item:Crimson Lucidity' then 'item:Ionian Boots of Lucidity' else x end from unnest(b.items) with ordinality as a(x,pos) order by pos) items
 from public.player_builds b where champion_id=p_champion and lane=p_lane and patch=p_patch
), total as (select count(*) n from selected),
groups as (select items,count(*) picks from selected group by items),
ranked as (select *,row_number() over(order by picks desc,items) rn from groups),
page as (select * from ranked order by rn offset greatest(coalesce(p_offset,0),0) limit 3),
slots as (select pos::integer slot,x item_id,count(*) picks from selected cross join lateral unnest(items) with ordinality a(x,pos) group by pos,x)
select jsonb_build_object('participants',total.n,'groups',coalesce((select jsonb_agg(jsonb_build_object('items',items,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by rn) from page),'[]'::jsonb),
'has_more',(select count(*) from groups)>greatest(coalesce(p_offset,0),0)+3,
'items',coalesce((select jsonb_agg(jsonb_build_object('item_id',item_id,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by picks desc,item_id) from (select item_id,sum(picks) picks from slots group by item_id) a),'[]'::jsonb),
'slots',coalesce((select jsonb_agg(jsonb_build_object('slot',slot,'item_id',item_id,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by slot,picks desc,item_id) from slots),'[]'::jsonb)) from total;
$$;
revoke all on function public.build_community_stats(text,text,text,integer) from public;
grant execute on function public.build_community_stats(text,text,text,integer) to anon,authenticated;
-- Только никнейм и содержимое сборки. Личные поля и ID не публикуются.
create or replace function public.list_community_builds(p_champion text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with selected as (
 select b.items,b.runes,b.updated_at,b.user_id,coalesce(p.nickname,'Игрок') nickname
 from public.player_builds b left join public.profiles p on p.id=b.user_id
 where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch
), page as (select * from selected order by updated_at desc,user_id offset greatest(coalesce(p_offset,0),0) limit 12)
select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+12,
'builds',coalesce((select jsonb_agg(jsonb_build_object('nickname',nickname,'items',items,'runes',runes,'updated_at',updated_at) order by updated_at desc,user_id) from page),'[]'::jsonb));
$$;
revoke all on function public.list_community_builds(text,text,text,integer) from public;
grant execute on function public.list_community_builds(text,text,text,integer) to anon,authenticated;
commit;
