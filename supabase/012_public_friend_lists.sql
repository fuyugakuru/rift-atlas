begin;
create or replace function public.public_player_profile(p_profile uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar,'riot_id',case when p.show_riot_id then p.riot_id else null end,
 'friend_count',(select count(*) from public.friendships f where f.state='accepted' and (f.sender=p.id or f.recipient=p.id)),
 'favorites',case when p.show_favorites then coalesce((select jsonb_agg(champion_id order by champion_id) from public.favorites where user_id=p.id),'[]'::jsonb) else null end,
 'relationship',case when p.id=auth.uid() then 'self' else coalesce((select case when f.state='accepted' then 'friends' when f.sender=auth.uid() then 'outgoing' else 'incoming' end from public.friendships f where (f.sender=auth.uid() and f.recipient=p.id) or (f.recipient=auth.uid() and f.sender=p.id)),'none') end)
 from public.profiles p where p.public_id=p_profile;
$$;

create or replace function public.public_player_friends(p_profile uuid,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
 with target as (select id from public.profiles where public_id=p_profile),
 selected as (select p.public_id id,p.nickname,p.avatar from public.friendships f cross join target t join public.profiles p on p.id=case when f.sender=t.id then f.recipient else f.sender end where f.state='accepted' and (f.sender=t.id or f.recipient=t.id)),
 page as (select * from selected order by nickname,id offset greatest(coalesce(p_offset,0),0) limit 20)
 select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+20,'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'nickname',nickname,'avatar',avatar) order by nickname,id) from page),'[]'::jsonb));
$$;
revoke all on function public.public_player_friends(uuid,integer) from public;
grant execute on function public.public_player_friends(uuid,integer) to anon,authenticated;
commit;
