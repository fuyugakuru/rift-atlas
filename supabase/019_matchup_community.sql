begin;
create table if not exists public.matchup_champion_catalog(id text primary key,lanes text[] not null);
insert into public.matchup_champion_catalog(id,lanes) values ('aurora',array['mid','baron']),
('akali',array['mid','baron']),
('akshan',array['mid','dragon']),
('alistar',array['support']),
('ambessa',array['jungle','baron']),
('amumu',array['jungle']),
('ahri',array['mid']),
('aatrox',array['baron','jungle']),
('aurelion-sol',array['mid']),
('bard',array['support']),
('blitzcrank',array['support']),
('braum',array['support']),
('brand',array['mid','support']),
('vi',array['jungle','baron']),
('warwick',array['jungle','baron']),
('varus',array['dragon','mid']),
('veigar',array['mid','support']),
('vayne',array['baron','dragon']),
('vex',array['mid','support']),
('velkoz',array['mid','support']),
('viego',array['jungle','baron']),
('viktor',array['mid']),
('vladimir',array['mid','baron']),
('volibear',array['baron','jungle']),
('wukong',array['baron','jungle']),
('galio',array['mid','support']),
('garen',array['baron']),
('gwen',array['baron','jungle']),
('hecarim',array['jungle']),
('gnar',array['baron']),
('gragas',array['jungle','baron','mid']),
('graves',array['jungle','baron']),
('darius',array['baron','jungle']),
('jax',array['baron','jungle']),
('jarvan-iv',array['jungle','baron']),
('jayce',array['mid','baron']),
('jhin',array['dragon']),
('jinx',array['dragon']),
('diana',array['jungle','mid']),
('dr-mundo',array['baron','jungle']),
('draven',array['dragon']),
('yone',array['mid','baron','jungle']),
('janna',array['support']),
('zyra',array['mid','support','baron']),
('zed',array['jungle','mid']),
('zeri',array['dragon']),
('ziggs',array['mid','dragon']),
('zilean',array['support','mid']),
('zoe',array['mid','support']),
('irelia',array['baron','mid']),
('ksante',array['baron']),
('khazix',array['jungle']),
('kayn',array['jungle']),
('kaisa',array['dragon','mid']),
('kalista',array['dragon','baron']),
('camille',array['baron','jungle']),
('karma',array['support','mid']),
('kassadin',array['mid']),
('katarina',array['mid']),
('kayle',array['baron','mid']),
('caitlyn',array['dragon']),
('kennen',array['mid','baron']),
('kindred',array['jungle','baron']),
('kogmaw',array['dragon']),
('corki',array['dragon','mid']),
('xin-zhao',array['jungle','baron']),
('leona',array['support']),
('lee-sin',array['jungle','baron']),
('lillia',array['jungle']),
('lissandra',array['mid','support']),
('lulu',array['support']),
('lux',array['mid','support']),
('lucian',array['dragon','mid']),
('malphite',array['baron','mid','support']),
('maokai',array['support','jungle','baron']),
('master-yi',array['jungle']),
('milio',array['support']),
('miss-fortune',array['dragon','support']),
('morgana',array['mid','support','jungle']),
('mordekaiser',array['baron','jungle']),
('mel',array['mid']),
('nami',array['support']),
('nasus',array['baron','jungle','mid']),
('nautilus',array['support','jungle','baron']),
('nidalee',array['jungle']),
('nilah',array['jungle','dragon']),
('nocturne',array['jungle','baron']),
('norra',array['mid','support']),
('nunu-and-willump',array['jungle','support']),
('olaf',array['jungle','baron']),
('orianna',array['mid','support']),
('ornn',array['support','baron']),
('pyke',array['support','mid']),
('pantheon',array['jungle','baron','mid']),
('poppy',array['baron','jungle','support']),
('ryze',array['mid','baron']),
('rumble',array['baron','mid']),
('rammus',array['jungle']),
('rell',array['support']),
('rengar',array['jungle','baron']),
('renekton',array['baron','jungle']),
('riven',array['baron','jungle']),
('rakan',array['support']),
('sylas',array['mid','jungle']),
('samira',array['dragon']),
('swain',array['mid','support','baron']),
('senna',array['support','dragon']),
('seraphine',array['support','mid']),
('sett',array['baron','jungle','support']),
('sivir',array['dragon']),
('singed',array['baron','support']),
('syndra',array['mid','support']),
('sion',array['baron','jungle']),
('skarner',array['jungle','baron']),
('smolder',array['dragon','baron']),
('sona',array['support']),
('soraka',array['support']),
('taliyah',array['mid','jungle']),
('talon',array['jungle','mid']),
('twisted-fate',array['mid']),
('twitch',array['dragon','jungle']),
('teemo',array['mid','baron']),
('thresh',array['support']),
('tryndamere',array['jungle','baron']),
('tristana',array['dragon','mid','baron']),
('urgot',array['baron']),
('fiddlesticks',array['jungle','support']),
('fizz',array['jungle','mid']),
('fiora',array['baron']),
('hwei',array['mid','support']),
('heimerdinger',array['mid','baron']),
('chogath',array['jungle','baron','mid','support']),
('xayah',array['dragon']),
('shen',array['baron','support','jungle']),
('shyvana',array['jungle','baron']),
('evelynn',array['jungle']),
('ezreal',array['dragon']),
('ekko',array['jungle','mid']),
('annie',array['mid','support']),
('ashe',array['dragon','support']),
('yuumi',array['support']),
('yunara',array['dragon']),
('yasuo',array['mid','baron']) on conflict(id) do update set lanes=excluded.lanes;
alter table public.matchup_champion_catalog enable row level security;
revoke all on public.matchup_champion_catalog from public,anon,authenticated;
create table if not exists public.matchup_tips(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 champion text not null,opponent text not null,lane text not null,patch text not null,body text not null check(char_length(body) between 20 and 1500),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,
 unique(user_id,champion,opponent,lane,patch),check(champion<>opponent));
create table if not exists public.matchup_results(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 champion text not null,opponent text not null,lane text not null,patch text not null,
 rank text not null check(rank in('diamond','master','grandmaster','challenger','sovereign')),
 won boolean not null,played_at timestamptz not null,created_at timestamptz not null default now(),deleted_at timestamptz,
 unique(user_id,played_at),check(champion<>opponent));
alter table public.matchup_tips enable row level security;
alter table public.matchup_results enable row level security;
revoke all on public.matchup_tips,public.matchup_results from public,anon,authenticated;
create index if not exists matchup_tips_pair on public.matchup_tips(champion,opponent,lane,patch,updated_at desc) where deleted_at is null;
create index if not exists matchup_results_scope on public.matchup_results(champion,lane,patch,opponent,rank) where deleted_at is null;
create index if not exists matchup_results_user on public.matchup_results(user_id,created_at desc);
create or replace function public.validate_matchup_scope(p_champion text,p_opponent text,p_lane text,p_patch text)
returns void language plpgsql stable security definer set search_path='' as $$ begin
 if p_champion is null or p_opponent is null or p_champion=p_opponent or p_lane is null or p_patch is null or p_patch!~'^[0-9]+[.][0-9]+[a-z]?$' or char_length(p_patch)>12 then raise exception 'Invalid matchup';end if;
 if not exists(select 1 from public.matchup_champion_catalog where id=p_champion and p_lane=any(lanes)) or not exists(select 1 from public.matchup_champion_catalog where id=p_opponent and p_lane=any(lanes)) then raise exception 'Invalid champion lane';end if;
end $$;
revoke all on function public.validate_matchup_scope(text,text,text,text) from public,anon,authenticated;
create or replace function public.set_matchup_tip(p_champion text,p_opponent text,p_lane text,p_patch text,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); content text:=btrim(coalesce(p_body,''));result uuid;
begin
 if me is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,19));
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 if content='' then update public.matchup_tips set deleted_at=now() where user_id=me and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch returning id into result;return result;end if;
 if char_length(content)<20 or char_length(content)>1500 then raise exception 'Tip length must be 20 to 1500';end if;
 if (select count(*) from public.matchup_tips where user_id=me and created_at>now()-interval '1 day')>=20 and not exists(select 1 from public.matchup_tips where user_id=me and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch) then raise exception 'Daily limit reached';end if;
 insert into public.matchup_tips(user_id,champion,opponent,lane,patch,body) values(me,p_champion,p_opponent,p_lane,p_patch,content)
 on conflict(user_id,champion,opponent,lane,patch) do update set body=excluded.body,deleted_at=null,updated_at=now() returning id into result;return result;
end $$;
create or replace function public.submit_matchup_result(p_champion text,p_opponent text,p_lane text,p_patch text,p_rank text,p_won boolean,p_played_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();played timestamptz:=date_trunc('minute',p_played_at);result uuid;
begin
 if me is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(me::text,19));
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 if p_rank is null or p_rank not in('diamond','master','grandmaster','challenger','sovereign') or p_won is null or played is null or played>now()+interval '5 minutes' or played<now()-interval '30 days' then raise exception 'Invalid match result';end if;
 if exists(select 1 from public.matchup_results where user_id=me and played_at=played and deleted_at is null) then raise exception 'Duplicate match result';end if;
 if (select count(*) from public.matchup_results where user_id=me and created_at>now()-interval '1 day')>=20 then raise exception 'Daily limit reached';end if;
 insert into public.matchup_results(user_id,champion,opponent,lane,patch,rank,won,played_at) values(me,p_champion,p_opponent,p_lane,p_patch,p_rank,p_won,played)
 on conflict(user_id,played_at) do update set champion=excluded.champion,opponent=excluded.opponent,lane=excluded.lane,patch=excluded.patch,rank=excluded.rank,won=excluded.won,deleted_at=null returning id into result;return result;
end $$;
create or replace function public.remove_matchup_result(p_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update public.matchup_results set deleted_at=now() where id=p_id and user_id=auth.uid() and deleted_at is null;return found;
end $$;
create or replace function public.community_matchup_stats(p_champion text,p_lane text,p_patch text,p_rank text default 'all')
returns jsonb language plpgsql stable security definer set search_path='' as $$ begin
 if p_rank is null or p_rank not in('all','diamond','master','grandmaster','challenger','sovereign') then raise exception 'Invalid rank';end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(s)) from (
 select opponent,count(*) as reports,count(*) filter(where won) as wins,count(*) filter(where not won) as losses,count(distinct user_id) as players,
 round(100.0*count(*) filter(where won)/count(*),4) as win from public.matchup_results where champion=p_champion and lane=p_lane and patch=p_patch and deleted_at is null and (p_rank='all' or rank=p_rank) group by opponent) s),'[]'::jsonb));
end $$;
create or replace function public.matchup_community(p_champion text,p_opponent text,p_lane text,p_patch text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_at integer:=least(greatest(coalesce(p_offset,0),0),1000);
begin
 perform public.validate_matchup_scope(p_champion,p_opponent,p_lane,p_patch);
 return jsonb_build_object(
 'tips',coalesce((select jsonb_agg(to_jsonb(t)) from(select t.id,t.body,t.updated_at,
 jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar) as author from public.matchup_tips t join public.profiles p on p.id=t.user_id
 where t.champion=p_champion and t.opponent=p_opponent and t.lane=p_lane and t.patch=p_patch and t.deleted_at is null order by t.updated_at desc,t.id limit 20 offset start_at) t),'[]'::jsonb),
 'has_more',(select count(*)>start_at+20 from public.matchup_tips where champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'own_tip',(select body from public.matchup_tips where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null),
 'my_results',coalesce((select jsonb_agg(to_jsonb(t)) from(select id,won,played_at,rank from public.matchup_results where user_id=auth.uid() and champion=p_champion and opponent=p_opponent and lane=p_lane and patch=p_patch and deleted_at is null order by played_at desc limit 10) t),'[]'::jsonb));
end $$;
revoke all on function public.set_matchup_tip(text,text,text,text,text),public.submit_matchup_result(text,text,text,text,text,boolean,timestamptz),public.remove_matchup_result(uuid),public.community_matchup_stats(text,text,text,text),public.matchup_community(text,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.set_matchup_tip(text,text,text,text,text),public.submit_matchup_result(text,text,text,text,text,boolean,timestamptz),public.remove_matchup_result(uuid) to authenticated;
grant execute on function public.community_matchup_stats(text,text,text,text),public.matchup_community(text,text,text,text,integer) to anon,authenticated;
notify pgrst,'reload schema';
commit;
