begin;
create table public.skin_publications (
 id text primary key check(id ~ '^[a-z0-9-]+-riot-[a-f0-9]{16}$'),
 champion text not null check(champion ~ '^[a-z0-9-]{1,50}$'),
 value jsonb not null,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default clock_timestamp()
);
alter table public.skin_publications enable row level security;
create unique index skin_publications_name on public.skin_publications(champion,lower(btrim(value->>'name')));
revoke all on public.skin_publications from public,anon,authenticated;
create function public.skins_public(p_champion text default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(value order by created_at,id),'[]'::jsonb) from public.skin_publications where p_champion is null or champion=p_champion
$$;
create function public.skins_publish(p_skins jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare s jsonb; total integer:=0; added integer;
begin
 if public.site_staff_role() is distinct from 'admin' then raise exception 'Administrator required';end if;
 if jsonb_typeof(p_skins) is distinct from 'array' or jsonb_array_length(p_skins) not between 1 and 100 then raise exception 'Invalid skins';end if;
 for s in select * from jsonb_array_elements(p_skins) loop
  if jsonb_typeof(s) is distinct from 'object' or s->>'champion' is null or s->>'champion' !~ '^[a-z0-9-]{1,50}$'
   or s->>'id' is null or s->>'id' !~ ('^'||(s->>'champion')||'-riot-[a-f0-9]{16}$')
   or s->>'name' is null or char_length(s->>'name') not between 1 and 250
   or s->>'image' is null or char_length(s->>'image')>2100 or s->>'image' !~ '^https://(cmsassets\.rgpub\.io|images\.contentstack\.io)/[^[:space:]]+$'
   or s->>'source' is distinct from ('https://wildrift.leagueoflegends.com/ru-ru/champions/'||(s->>'champion')||'/')
   or octet_length(s::text)>8000 then raise exception 'Invalid official skin';end if;
  insert into public.skin_publications(id,champion,value,actor_id) values(s->>'id',s->>'champion',jsonb_build_object(
   'id',s->>'id','champion',s->>'champion','name',s->>'name','officialName',s->>'name','image',s->>'image',
   'source',s->>'source','rarity','unknown','exclusive',false,'video',null,'videoSource',null),auth.uid()) on conflict do nothing;
  get diagnostics added=row_count;total:=total+added;
 end loop;
 return total;
end $$;
revoke all on function public.skins_public(text),public.skins_publish(jsonb) from public,anon,authenticated;
grant execute on function public.skins_public(text) to anon,authenticated;
grant execute on function public.skins_publish(jsonb) to authenticated;
commit;
