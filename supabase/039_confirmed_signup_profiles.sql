begin;
-- A confirmed registration must be searchable even before its owner saves settings.
create function public.create_confirmed_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
 if new.email_confirmed_at is null then return new;end if;
 chosen:=btrim(coalesce(new.raw_user_meta_data->>'nickname',''));
 if char_length(chosen) not between 2 and 32 then chosen:='Игрок';end if;
 insert into public.profiles(id,nickname) values(new.id,chosen) on conflict(id) do nothing;
 return new;
end $$;
revoke all on function public.create_confirmed_signup_profile() from public,anon,authenticated;
create trigger rift_confirmed_signup_profile after insert or update of email_confirmed_at on auth.users for each row execute function public.create_confirmed_signup_profile();
-- Restore missing confirmed profiles only; keep nicknames, avatars and privacy
-- settings of every existing profile intact.
insert into public.profiles(id,nickname)
 select u.id,case when char_length(btrim(coalesce(u.raw_user_meta_data->>'nickname',''))) between 2 and 32 then btrim(u.raw_user_meta_data->>'nickname') else 'Игрок' end
 from auth.users u where u.email_confirmed_at is not null
 and not exists(select 1 from public.profiles p where p.id=u.id)
 on conflict(id) do nothing;
commit;
