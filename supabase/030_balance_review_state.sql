begin;
create table public.balance_acknowledgements (
 event_id text primary key check(event_id ~ '^[a-f0-9]{64}$'),
 official_changes jsonb not null,
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.balance_acknowledgements enable row level security;
revoke all on public.balance_acknowledgements from public,anon,authenticated;
create function public.balance_acknowledge(p_event text,p_changes jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare entry jsonb;
begin
 if public.site_staff_role() is distinct from 'admin' then raise exception 'Administrator required';end if;
 if p_event !~ '^[a-f0-9]{64}$' or jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 100 or octet_length(p_changes::text)>40000 then raise exception 'Invalid changes';end if;
 for entry in select value from jsonb_array_elements(p_changes) loop
  if entry->>'id' is null or entry->>'id' !~ '^[a-f0-9]{64}$' or entry->>'patch' is null or entry->>'patch' !~ '^[0-9]{1,2}\.[0-9]{1,2}[a-z]?$' or entry->>'source' is null or entry->>'source' not in ('https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-'||replace(entry->>'patch','.','-'),'https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-'||replace(entry->>'patch','.','-')||'/') then raise exception 'Invalid official change';end if;
 end loop;
 insert into public.balance_acknowledgements(event_id,official_changes,actor_id) values(p_event,p_changes,auth.uid()) on conflict(event_id) do nothing;
 return true;
end $$;
create or replace function public.balance_review_history() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.site_staff_role() is distinct from 'admin' then raise exception 'Administrator required';end if;
 return (select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb) from (
  select p.created_at,jsonb_build_object('event_id',p.event_id,'kind','publication','key',p.target_key,'patch',p.patch,'revision',p.id,'created_at',p.created_at,'change_ids',coalesce((select jsonb_agg(e->>'id') from jsonb_array_elements(p.official_changes) e where e->>'id' is not null),'[]'::jsonb)) item from public.balance_publications p
  union all
  select a.created_at,jsonb_build_object('event_id',a.event_id,'kind','acknowledgement','created_at',a.created_at,'change_ids',(select jsonb_agg(e->>'id') from jsonb_array_elements(a.official_changes) e)) item from public.balance_acknowledgements a
 ) events);
end $$;
revoke all on function public.balance_acknowledge(text,jsonb) from public,anon,authenticated;
grant execute on function public.balance_acknowledge(text,jsonb) to authenticated;
commit;
