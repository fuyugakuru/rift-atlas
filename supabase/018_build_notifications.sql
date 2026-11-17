begin;
alter table public.friend_notifications add column if not exists champion_id text;
alter table public.friend_notifications add column if not exists lane text;
alter table public.friend_notifications add column if not exists patch text;
alter table public.friend_notifications add column if not exists milestone integer;
alter table public.friend_notifications drop constraint if exists friend_notifications_kind_check;
alter table public.friend_notifications add constraint friend_notifications_kind_check check(kind in('request','accepted','build_saved','build_likes'));
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.friend_notifications'::regclass and conname='notification_build_reference') then
  alter table public.friend_notifications add constraint notification_build_reference foreign key(recipient,champion_id,lane,patch) references public.player_builds(user_id,champion_id,lane,patch) on delete cascade;
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.friend_notifications'::regclass and conname='notification_build_metadata') then
  alter table public.friend_notifications add constraint notification_build_metadata check(
   (kind in('request','accepted') and champion_id is null and lane is null and patch is null and milestone is null)
   or (kind='build_saved' and champion_id is not null and lane is not null and patch is not null and milestone is null)
   or (kind='build_likes' and champion_id is not null and lane is not null and patch is not null and milestone is not null and milestone>0)
  );
 end if;
end $$;
-- Keep a notice after unsaving, so re-saving cannot send the author another one.
create unique index if not exists notification_build_saved_once on public.friend_notifications(recipient,actor,champion_id,lane,patch) where kind='build_saved';
create unique index if not exists notification_build_likes_once on public.friend_notifications(recipient,champion_id,lane,patch,milestone) where kind='build_likes';
create or replace function public.build_saved_notification_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.user_id<>new.author_id then
  insert into public.friend_notifications(recipient,actor,kind,champion_id,lane,patch)
  values(new.author_id,new.user_id,'build_saved',new.champion_id,new.lane,new.patch) on conflict do nothing;
 end if;
 return null;
end $$;
create or replace function public.build_likes_notification_event()
returns trigger language plpgsql security definer set search_path='' as $$
declare likes bigint;
begin
 if new.vote<>1 then return null;end if;
 if tg_op='UPDATE' then if old.vote=1 then return null;end if;end if;
 -- Serialize new likes on a build, so simultaneous votes cannot skip a milestone.
 perform pg_advisory_xact_lock(hashtextextended(jsonb_build_array(new.author_id,new.champion_id,new.lane,new.patch)::text,18));
 select count(*) into likes from public.player_build_votes where author_id=new.author_id and champion_id=new.champion_id and lane=new.lane and patch=new.patch and vote=1;
 if likes=any(array[1,10,25,50,100,250,500,1000]::bigint[]) then
  insert into public.friend_notifications(recipient,actor,kind,champion_id,lane,patch,milestone)
  values(new.author_id,new.user_id,'build_likes',new.champion_id,new.lane,new.patch,likes::integer) on conflict do nothing;
 end if;
 return null;
end $$;
revoke all on function public.build_saved_notification_event(),public.build_likes_notification_event() from public,anon,authenticated;
drop trigger if exists build_saved_notifications on public.saved_player_builds;
create trigger build_saved_notifications after insert on public.saved_player_builds for each row execute function public.build_saved_notification_event();
drop trigger if exists build_likes_notifications on public.player_build_votes;
create trigger build_likes_notifications after insert or update on public.player_build_votes for each row execute function public.build_likes_notification_event();
create or replace function public.my_notifications(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); start_at integer:=greatest(coalesce(p_offset,0),0); result jsonb;
begin
 if me is null then raise exception 'Sign in required';end if;
 with page as (
  select n.*,p.public_id,p.nickname,p.avatar,b.title build_title from public.friend_notifications n
  join public.profiles p on p.id=n.actor
  left join public.player_builds b on (b.user_id,b.champion_id,b.lane,b.patch)=(n.recipient,n.champion_id,n.lane,n.patch)
  where n.recipient=me order by n.created_at desc,n.id offset start_at limit 20
 )
 select jsonb_build_object('unread',(select count(*) from public.friend_notifications where recipient=me and read_at is null),
 'has_more',(select count(*) from public.friend_notifications where recipient=me)>start_at+20,
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'created_at',created_at,'unread',read_at is null,
 'player',jsonb_build_object('id',public_id,'nickname',nickname,'avatar',avatar),
 'build',case when champion_id is null then null else jsonb_build_object('champion',champion_id,'lane',lane,'patch',patch,'title',build_title,'milestone',milestone) end
 ) order by created_at desc,id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.my_notifications(integer) from public,anon;
grant execute on function public.my_notifications(integer) to authenticated;
notify pgrst,'reload schema';
commit;
