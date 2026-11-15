begin;
alter table public.profiles add column if not exists riot_id text not null default '';
alter table public.profiles add constraint profiles_riot_id_format check (
 riot_id='' or (char_length(riot_id)<=22 and riot_id ~ '^[^#[:cntrl:]]{3,16}#[[:alnum:]]{3,5}$')
);
commit;
