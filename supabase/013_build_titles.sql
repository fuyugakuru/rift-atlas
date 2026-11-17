begin;
alter table public.player_builds add column if not exists title text not null default '';
alter table public.player_builds add column if not exists description text not null default '';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='player_builds_text_length' and conrelid='public.player_builds'::regclass) then
 alter table public.player_builds add constraint player_builds_text_length check(char_length(title)<=60 and char_length(description)<=600);
 end if;
end $$;
create or replace function public.public_player_builds(p_profile uuid,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
 with chosen as (select b.* from public.player_builds b join public.profiles p on p.id=b.user_id where p.public_id=p_profile),
 page as (select * from chosen order by updated_at desc,champion_id,lane,patch offset greatest(coalesce(p_offset,0),0) limit 12)
 select jsonb_build_object('total',(select count(*) from chosen),'has_more',(select count(*) from chosen)>greatest(coalesce(p_offset,0),0)+12,'builds',coalesce((select jsonb_agg(jsonb_build_object('champion_id',champion_id,'lane',lane,'patch',patch,'items',items,'runes',runes,'spells',spells,'updated_at',updated_at,'title',title,'description',description) order by updated_at desc,champion_id,lane,patch) from page),'[]'::jsonb));
$$;
create or replace function public.list_community_builds(p_champion text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with selected as (
 select b.title,b.description,b.items,b.runes,b.spells,b.updated_at,b.user_id,coalesce(p.nickname,'Игрок') nickname,coalesce(p.avatar,'mel') avatar,p.public_id profile_id
 from public.player_builds b left join public.profiles p on p.id=b.user_id
 where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch
), page as (select * from selected order by updated_at desc,user_id offset greatest(coalesce(p_offset,0),0) limit 12)
select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+12,
'builds',coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'nickname',nickname,'avatar',avatar,'spells',spells,'items',items,'runes',runes,'updated_at',updated_at,'title',title,'description',description) order by updated_at desc,user_id) from page),'[]'::jsonb));
$$;
revoke all on function public.public_player_builds(uuid,integer),public.list_community_builds(text,text,text,integer) from public;
grant execute on function public.public_player_builds(uuid,integer),public.list_community_builds(text,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
