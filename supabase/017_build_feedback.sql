begin;
create table if not exists public.player_build_votes (
 user_id uuid not null references auth.users(id) on delete cascade,
 author_id uuid not null,champion_id text not null,lane text not null,patch text not null,
 vote smallint not null check(vote in (-1,1)),
 primary key(user_id,author_id,champion_id,lane,patch),
 foreign key(author_id,champion_id,lane,patch) references public.player_builds(user_id,champion_id,lane,patch) on delete cascade,
 check(user_id<>author_id)
);
alter table public.player_build_votes enable row level security;
revoke all on public.player_build_votes from public,anon,authenticated;
create index if not exists player_build_votes_build on public.player_build_votes(author_id,champion_id,lane,patch,vote);
create index if not exists saved_player_builds_build on public.saved_player_builds(author_id,champion_id,lane,patch);
create or replace function public.set_build_vote(p_profile uuid,p_champion text,p_lane text,p_patch text,p_vote smallint)
returns smallint language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); author uuid;
begin
 if me is null then raise exception 'Sign in required'; end if;
 if p_vote is null or p_vote not in(-1,0,1) then raise exception 'Invalid vote'; end if;
 select id into author from public.profiles where public_id=p_profile;
 if author is null or not exists(select 1 from public.player_builds where user_id=author and champion_id=p_champion and lane=p_lane and patch=p_patch) then raise exception 'Build not found';end if;
 if me=author then raise exception 'Cannot vote on own build';end if;
 if p_vote=0 then
 delete from public.player_build_votes where user_id=me and author_id=author and champion_id=p_champion and lane=p_lane and patch=p_patch;
 else
 insert into public.player_build_votes(user_id,author_id,champion_id,lane,patch,vote) values(me,author,p_champion,p_lane,p_patch,p_vote)
 on conflict(user_id,author_id,champion_id,lane,patch) do update set vote=excluded.vote;
 end if;
 return p_vote;
end $$;
create or replace function public.build_engagement(p_builds jsonb)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb;
begin
 if jsonb_typeof(p_builds)<>'array' or jsonb_array_length(p_builds)>100 then raise exception 'Invalid request';end if;
 with requested as(select x,ord from jsonb_array_elements(p_builds) with ordinality t(x,ord)),
 chosen as(select r.ord,b.user_id,b.champion_id,b.lane,b.patch from requested r left join public.profiles p on p.public_id::text=r.x->>'profile'
 left join public.player_builds b on b.user_id=coalesce(p.id,case when r.x->>'profile' is null then me end) and b.champion_id=r.x->>'champion' and b.lane=r.x->>'lane' and b.patch=r.x->>'patch')
 select coalesce(jsonb_agg(jsonb_build_object(
 'saves',(select count(*) from public.saved_player_builds s where (s.author_id,s.champion_id,s.lane,s.patch)=(c.user_id,c.champion_id,c.lane,c.patch)),
 'likes',(select count(*) from public.player_build_votes v where (v.author_id,v.champion_id,v.lane,v.patch)=(c.user_id,c.champion_id,c.lane,c.patch) and v.vote=1),
 'dislikes',(select count(*) from public.player_build_votes v where (v.author_id,v.champion_id,v.lane,v.patch)=(c.user_id,c.champion_id,c.lane,c.patch) and v.vote=-1),
 'vote',coalesce((select v.vote from public.player_build_votes v where v.user_id=me and (v.author_id,v.champion_id,v.lane,v.patch)=(c.user_id,c.champion_id,c.lane,c.patch)),0),
 'self',coalesce(c.user_id=me,false)) order by c.ord),'[]'::jsonb) into result from chosen c;
 return result;
end $$;
revoke all on function public.set_build_vote(uuid,text,text,text,smallint),public.build_engagement(jsonb) from public,anon;
grant execute on function public.set_build_vote(uuid,text,text,text,smallint) to authenticated;
grant execute on function public.build_engagement(jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
