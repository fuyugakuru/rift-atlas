begin;
-- Only administrators can publish game data. No service-role key is needed in GitHub.
create table public.balance_publications (
 id bigint generated always as identity primary key,
 event_id text not null unique check(event_id ~ '^[a-f0-9]{64}$'),
 target_key text not null check(target_key ~ '^(item:.{1,100}|rune:.{1,100}|champion:[a-z0-9-]+:([0-9]|base))$'),
 patch text not null check(patch ~ '^[0-9]{1,2}\.[0-9]{1,2}[a-z]?$'),
 source text not null check(source ~ '^https://wildrift\.leagueoflegends\.com/en-us/news/game-updates/wild-rift-patch-notes-[0-9]+-[0-9]+[a-z]?/?$'),
 before_value jsonb not null,
 after_value jsonb not null,
 official_changes jsonb not null,
 actor_id uuid not null references auth.users(id),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.balance_publications enable row level security;
revoke all on public.balance_publications from public,anon,authenticated;
create table public.balance_current (
 target_key text primary key,
 publication_id bigint not null references public.balance_publications(id)
);
alter table public.balance_current enable row level security;
revoke all on public.balance_current from public,anon,authenticated;

create function public.balance_public() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('key',p.target_key,'patch',p.patch,'value',p.after_value,'revision',p.id,'source',p.source,'updated_at',p.created_at) order by p.target_key),'[]'::jsonb)
 from public.balance_current c join public.balance_publications p on p.id=c.publication_id
$$;
create function public.balance_review_history() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if public.site_staff_role() is distinct from 'admin' then raise exception 'Administrator required';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('event_id',p.event_id,'key',p.target_key,'patch',p.patch,'revision',p.id,'created_at',p.created_at) order by p.id desc),'[]'::jsonb) from public.balance_publications p);
end $$;
create function public.balance_publish(p_event text,p_key text,p_patch text,p_source text,p_before jsonb,p_after jsonb,p_changes jsonb,p_expected bigint default null) returns bigint language plpgsql security definer set search_path='' as $$
declare current_row public.balance_publications; new_id bigint; source_patch text;
begin
 if public.site_staff_role() is distinct from 'admin' then raise exception 'Administrator required';end if;
 if p_event !~ '^[a-f0-9]{64}$' or p_key !~ '^(item:.{1,100}|rune:.{1,100}|champion:[a-z0-9-]+:([0-9]|base))$' then raise exception 'Invalid target';end if;
 if p_patch !~ '^[0-9]{1,2}\.[0-9]{1,2}[a-z]?$' then raise exception 'Invalid patch';end if;
 source_patch:=replace(p_patch,'.','-');
 if p_source not in ('https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-'||source_patch,'https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-'||source_patch||'/') then raise exception 'Invalid official source';end if;
 if jsonb_typeof(p_before) is distinct from 'object' or jsonb_typeof(p_after) is distinct from 'object' or jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 100 then raise exception 'Invalid data';end if;
 if exists(select 1 from jsonb_array_elements(p_changes) e where e->>'mode' is distinct from 'classic' or e->>'patch' is distinct from p_patch or e->>'source' is distinct from p_source) then raise exception 'Mode or source mismatch';end if;
 if exists(select 1 from jsonb_object_keys(p_after) k where k not in ('description','cooldown','cost')) or not p_after ? 'description' or exists(select 1 from jsonb_each(p_after) e where jsonb_typeof(e.value)<>'string') or char_length(p_after->>'description') not between 1 and 20000 or octet_length(p_after::text)>30000 or octet_length(p_changes::text)>40000 then raise exception 'Invalid replacement';end if;
 -- Serializes publication even when there is no current row yet.
 perform pg_advisory_xact_lock(hashtextextended(p_key,0));
 select p.* into current_row from public.balance_current c join public.balance_publications p on p.id=c.publication_id where c.target_key=p_key;
 if current_row.id is distinct from p_expected then raise exception 'Data changed; refresh before publishing';end if;
 if current_row.id is not null then
  if current_row.after_value is distinct from p_before then raise exception 'Baseline changed';end if;
  if array[split_part(p_patch,'.',1)::int,regexp_replace(split_part(p_patch,'.',2),'[^0-9]','','g')::int,ascii(coalesce(nullif(regexp_replace(p_patch,'[0-9.]','','g'),''),'`'))] < array[split_part(current_row.patch,'.',1)::int,regexp_replace(split_part(current_row.patch,'.',2),'[^0-9]','','g')::int,ascii(coalesce(nullif(regexp_replace(current_row.patch,'[0-9.]','','g'),''),'`'))] then raise exception 'Older patch cannot replace newer data';end if;
 end if;
 insert into public.balance_publications(event_id,target_key,patch,source,before_value,after_value,official_changes,actor_id) values(p_event,p_key,p_patch,p_source,p_before,p_after,p_changes,auth.uid()) returning id into new_id;
 insert into public.balance_current(target_key,publication_id) values(p_key,new_id) on conflict(target_key) do update set publication_id=excluded.publication_id;
 return new_id;
end $$;
revoke all on function public.balance_public(),public.balance_review_history(),public.balance_publish(text,text,text,text,jsonb,jsonb,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.balance_public() to anon,authenticated;
grant execute on function public.balance_review_history(),public.balance_publish(text,text,text,text,jsonb,jsonb,jsonb,bigint) to authenticated;
commit;
