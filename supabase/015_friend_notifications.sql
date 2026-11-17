begin;
create table if not exists public.friend_notifications (
 id uuid primary key default gen_random_uuid(),
 recipient uuid not null references public.profiles(id) on delete cascade,
 actor uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('request','accepted')),
 created_at timestamptz not null default now(), read_at timestamptz,
 check(recipient<>actor)
);
alter table public.friend_notifications enable row level security;
revoke all on public.friend_notifications from public,anon,authenticated;
create index if not exists friend_notifications_recipient on public.friend_notifications(recipient,created_at desc,id);
create or replace function public.friend_notification_event()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.friend_notifications(recipient,actor,kind) values(new.recipient,new.sender,'request');
 elsif tg_op='UPDATE' and old.state='pending' and new.state='accepted' then
  update public.friend_notifications set read_at=coalesce(read_at,now()) where recipient=new.recipient and actor=new.sender and kind='request';
  insert into public.friend_notifications(recipient,actor,kind) values(new.sender,new.recipient,'accepted');
 elsif tg_op='DELETE' then
  delete from public.friend_notifications where recipient=old.recipient and actor=old.sender and kind='request';
 end if;
 return null;
end $$;
revoke all on function public.friend_notification_event() from public,anon,authenticated;
drop trigger if exists friendship_notifications on public.friendships;
create trigger friendship_notifications after insert or update or delete on public.friendships for each row execute function public.friend_notification_event();
-- Preserve existing incoming requests, without inventing historical acceptances.
insert into public.friend_notifications(recipient,actor,kind,created_at)
 select f.recipient,f.sender,'request',f.created_at from public.friendships f where f.state='pending'
 and not exists(select 1 from public.friend_notifications n where n.recipient=f.recipient and n.actor=f.sender and n.kind='request');
create or replace function public.my_notifications(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid(); start_at integer:=greatest(coalesce(p_offset,0),0); result jsonb;
begin
 if me is null then raise exception 'Sign in required'; end if;
 with page as (select n.*,p.public_id,p.nickname,p.avatar from public.friend_notifications n join public.profiles p on p.id=n.actor where n.recipient=me order by n.created_at desc,n.id offset start_at limit 20)
 select jsonb_build_object('unread',(select count(*) from public.friend_notifications where recipient=me and read_at is null),'has_more',(select count(*) from public.friend_notifications where recipient=me)>start_at+20,
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'created_at',created_at,'unread',read_at is null,'player',jsonb_build_object('id',public_id,'nickname',nickname,'avatar',avatar)) order by created_at desc,id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
create or replace function public.read_notifications(p_ids uuid[])
returns bigint language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); remaining bigint;
begin
 if me is null then raise exception 'Sign in required'; end if;
 if coalesce(cardinality(p_ids),0)>20 then raise exception 'Too many notifications'; end if;
 update public.friend_notifications set read_at=coalesce(read_at,now()) where recipient=me and id=any(p_ids);
 select count(*) into remaining from public.friend_notifications where recipient=me and read_at is null;
 return remaining;
end $$;
revoke all on function public.my_notifications(integer),public.read_notifications(uuid[]) from public,anon;
grant execute on function public.my_notifications(integer),public.read_notifications(uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
