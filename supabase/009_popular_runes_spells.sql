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
select jsonb_build_object('participants',total.n,'rune_page',(select jsonb_build_object('ids',ids,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) from (select b.runes ids,count(*) picks from public.player_builds b where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch and cardinality(b.runes)=5 group by 1 order by count(*) desc,1 limit 1) ranked),'spell_pair',(select jsonb_build_object('ids',ids,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) from (select array(select s from unnest(b.spells) s order by s) ids,count(*) picks from public.player_builds b where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch and cardinality(b.spells)=2 group by 1 order by count(*) desc,1 limit 1) ranked),'groups',coalesce((select jsonb_agg(jsonb_build_object('items',items,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by rn) from page),'[]'::jsonb),
'has_more',(select count(*) from groups)>greatest(coalesce(p_offset,0),0)+3,
'items',coalesce((select jsonb_agg(jsonb_build_object('item_id',item_id,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by picks desc,item_id) from (select item_id,sum(picks) picks from slots group by item_id) a),'[]'::jsonb),
'slots',coalesce((select jsonb_agg(jsonb_build_object('slot',slot,'item_id',item_id,'picks',picks,'percentage',round(100.0*picks/nullif(total.n,0),1)) order by slot,picks desc,item_id) from slots),'[]'::jsonb)) from total;
$$;
revoke all on function public.build_community_stats(text,text,text,integer) from public;
grant execute on function public.build_community_stats(text,text,text,integer) to anon,authenticated;
commit;
