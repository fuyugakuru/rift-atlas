begin;
alter table public.profiles add column if not exists public_id uuid not null default gen_random_uuid();
create unique index if not exists profiles_public_id on public.profiles(public_id);
alter table public.profiles add column if not exists show_riot_id boolean not null default false;
alter table public.profiles add column if not exists show_favorites boolean not null default false;
create table if not exists public.friendships (
 sender uuid not null references public.profiles(id) on delete cascade,
 recipient uuid not null references public.profiles(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','accepted')),
 created_at timestamptz not null default now(),check(sender<>recipient),primary key(sender,recipient)
);
create unique index if not exists friendship_pair on public.friendships(least(sender,recipient),greatest(sender,recipient));
alter table public.friendships enable row level security;
revoke all on public.friendships from public,anon,authenticated;
create or replace function public.public_player_profile(p_profile uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar,'riot_id',case when p.show_riot_id then p.riot_id else null end,
 'favorites',case when p.show_favorites then coalesce((select jsonb_agg(champion_id order by champion_id) from public.favorites where user_id=p.id),'[]'::jsonb) else null end,
 'relationship',case when p.id=auth.uid() then 'self' else coalesce((select case when f.state='accepted' then 'friends' when f.sender=auth.uid() then 'outgoing' else 'incoming' end from public.friendships f where (f.sender=auth.uid() and f.recipient=p.id) or (f.recipient=auth.uid() and f.sender=p.id)),'none') end)
 from public.profiles p where p.public_id=p_profile;
$$;
create or replace function public.public_player_builds(p_profile uuid,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
 with chosen as (select b.* from public.player_builds b join public.profiles p on p.id=b.user_id where p.public_id=p_profile),
 page as (select * from chosen order by updated_at desc,champion_id,lane,patch offset greatest(coalesce(p_offset,0),0) limit 12)
 select jsonb_build_object('total',(select count(*) from chosen),'has_more',(select count(*) from chosen)>greatest(coalesce(p_offset,0),0)+12,'builds',coalesce((select jsonb_agg(jsonb_build_object('champion_id',champion_id,'lane',lane,'patch',patch,'items',items,'runes',runes,'spells',spells,'updated_at',updated_at) order by updated_at desc,champion_id,lane,patch) from page),'[]'::jsonb));
$$;
create or replace function public.friendship_action(p_profile uuid,p_action text)
returns text language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); target uuid; f public.friendships%rowtype;
begin
 if me is null then raise exception 'Sign in required'; end if;
 select id into target from public.profiles where public_id=p_profile;
 if target is null or target=me or not exists(select 1 from public.profiles where id=me) then raise exception 'Invalid player'; end if;
 -- Сериализуем действия одной пары: встречные заявки не создают дубликаты.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(least(me,target)::text||greatest(me,target)::text,0));
 select * into f from public.friendships where (sender=me and recipient=target) or (sender=target and recipient=me) for update;
 if p_action='send' then
  if f.sender is null then insert into public.friendships(sender,recipient) values(me,target); end if;
 elsif p_action='accept' then
  if f.recipient<>me or f.state<>'pending' or f.sender is null then raise exception 'Incoming request required'; end if;
  update public.friendships set state='accepted' where sender=f.sender and recipient=me;
 elsif p_action='decline' then
  if f.recipient<>me or f.state<>'pending' or f.sender is null then raise exception 'Incoming request required'; end if;
  delete from public.friendships where sender=f.sender and recipient=me;
 elsif p_action='cancel' then
  if f.sender<>me or f.state<>'pending' or f.sender is null then raise exception 'Outgoing request required'; end if;
  delete from public.friendships where sender=me and recipient=f.recipient;
 elsif p_action='remove' then
  if f.state<>'accepted' or f.sender is null then raise exception 'Friendship required'; end if;
  delete from public.friendships where sender=f.sender and recipient=f.recipient;
 else raise exception 'Unknown action'; end if;
 return 'ok';
end $$;
create or replace function public.my_friendships(p_section text default 'friends',p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
 with selected as (
 select f.*,case when f.sender=auth.uid() then f.recipient else f.sender end other from public.friendships f
 where auth.uid() is not null and (f.sender=auth.uid() or f.recipient=auth.uid())
 and ((p_section='friends' and f.state='accepted') or (p_section='incoming' and f.state='pending' and f.recipient=auth.uid()) or (p_section='outgoing' and f.state='pending' and f.sender=auth.uid()))
 ), page as (select * from selected order by created_at desc,sender,recipient offset greatest(coalesce(p_offset,0),0) limit 20)
 select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+20,'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar) order by f.created_at desc,p.public_id) from page f join public.profiles p on p.id=f.other),'[]'::jsonb));
$$;
create or replace function public.profile_visibility(p_riot boolean default null,p_favorites boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_riot is not null and p_favorites is not null then update public.profiles set show_riot_id=p_riot,show_favorites=p_favorites where id=auth.uid(); end if;
 select jsonb_build_object('id',public_id,'show_riot_id',show_riot_id,'show_favorites',show_favorites) into result from public.profiles where id=auth.uid();return result;
end $$;
revoke all on function public.public_player_profile(uuid),public.public_player_builds(uuid,integer),public.friendship_action(uuid,text),public.my_friendships(text,integer),public.profile_visibility(boolean,boolean) from public;
grant execute on function public.public_player_profile(uuid),public.public_player_builds(uuid,integer) to anon,authenticated;
grant execute on function public.friendship_action(uuid,text),public.my_friendships(text,integer),public.profile_visibility(boolean,boolean) to authenticated;

create or replace function public.list_community_builds(p_champion text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path='' as $$
with selected as (
 select b.items,b.runes,b.spells,b.updated_at,b.user_id,coalesce(p.nickname,'Игрок') nickname,coalesce(p.avatar,'mel') avatar,p.public_id profile_id
 from public.player_builds b left join public.profiles p on p.id=b.user_id
 where b.champion_id=p_champion and b.lane=p_lane and b.patch=p_patch
), page as (select * from selected order by updated_at desc,user_id offset greatest(coalesce(p_offset,0),0) limit 12)
select jsonb_build_object('total',(select count(*) from selected),'has_more',(select count(*) from selected)>greatest(coalesce(p_offset,0),0)+12,
'builds',coalesce((select jsonb_agg(jsonb_build_object('profile_id',profile_id,'nickname',nickname,'avatar',avatar,'spells',spells,'items',items,'runes',runes,'updated_at',updated_at) order by updated_at desc,user_id) from page),'[]'::jsonb));
$$;
revoke all on function public.list_community_builds(text,text,text,integer) from public;
grant execute on function public.list_community_builds(text,text,text,integer) to anon,authenticated;
commit;
