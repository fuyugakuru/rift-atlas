begin;
create table if not exists public.saved_player_builds (
 user_id uuid not null references auth.users(id) on delete cascade,
 author_id uuid not null,
 champion_id text not null, lane text not null, patch text not null,
 saved_at timestamptz not null default now(),
 primary key(user_id,author_id,champion_id,lane,patch),
 foreign key(author_id,champion_id,lane,patch) references public.player_builds(user_id,champion_id,lane,patch) on delete cascade,
 check(user_id<>author_id)
);
alter table public.saved_player_builds enable row level security;
revoke all on public.saved_player_builds from public,anon,authenticated;
create index if not exists saved_player_builds_recent on public.saved_player_builds(user_id,saved_at desc);
create or replace function public.set_saved_build(p_profile uuid,p_champion text,p_lane text,p_patch text,p_saved boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); author uuid;
begin
 if me is null then raise exception 'Sign in required'; end if;
 select id into author from public.profiles where public_id=p_profile;
 if author is null then raise exception 'Build not found'; end if;
 if p_saved is not true then
  delete from public.saved_player_builds where user_id=me and author_id=author and champion_id=p_champion and lane=p_lane and patch=p_patch;
  return false;
 end if;
 if me=author then raise exception 'Your build is already in your profile'; end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,16));
 if not exists(select 1 from public.player_builds where user_id=author and champion_id=p_champion and lane=p_lane and patch=p_patch) then raise exception 'Build not found'; end if;
 if not exists(select 1 from public.saved_player_builds where user_id=me and author_id=author and champion_id=p_champion and lane=p_lane and patch=p_patch)
 and (select count(*) from public.saved_player_builds where user_id=me)>=500 then raise exception 'Saved build limit reached'; end if;
 insert into public.saved_player_builds(user_id,author_id,champion_id,lane,patch) values(me,author,p_champion,p_lane,p_patch) on conflict do nothing;
 return true;
end $$;
create or replace function public.saved_build_flags(p_builds jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if me is null then raise exception 'Sign in required'; end if;
 if jsonb_typeof(p_builds)<>'array' or jsonb_array_length(p_builds)>100 then raise exception 'Invalid request'; end if;
 select coalesce(jsonb_agg(exists(select 1 from public.saved_player_builds s join public.profiles p on p.id=s.author_id where s.user_id=me and p.public_id::text=x->>'profile' and s.champion_id=x->>'champion' and s.lane=x->>'lane' and s.patch=x->>'patch') order by ord),'[]'::jsonb)
 into result from jsonb_array_elements(p_builds) with ordinality t(x,ord);
 return result;
end $$;
create or replace function public.my_saved_builds(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); start_at integer:=greatest(coalesce(p_offset,0),0); result jsonb;
begin
 if me is null then raise exception 'Sign in required'; end if;
 with chosen as (
 select b.champion_id,b.lane,b.patch,b.items,b.runes,b.spells,b.title,b.description,b.updated_at,s.saved_at,p.public_id profile_id,p.nickname,p.avatar
 from public.saved_player_builds s join public.player_builds b on (b.user_id,b.champion_id,b.lane,b.patch)=(s.author_id,s.champion_id,s.lane,s.patch)
 join public.profiles p on p.id=s.author_id where s.user_id=me
 ), page as(select * from chosen order by saved_at desc,profile_id,champion_id,lane,patch offset start_at limit 4)
 select jsonb_build_object('total',(select count(*) from chosen),'has_more',(select count(*) from chosen)>start_at+4,'builds',coalesce((select jsonb_agg(to_jsonb(page) order by saved_at desc,profile_id,champion_id,lane,patch) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.set_saved_build(uuid,text,text,text,boolean),public.saved_build_flags(jsonb),public.my_saved_builds(integer) from public,anon;
grant execute on function public.set_saved_build(uuid,text,text,text,boolean),public.saved_build_flags(jsonb),public.my_saved_builds(integer) to authenticated;
notify pgrst,'reload schema';
commit;
