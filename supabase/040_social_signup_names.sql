begin;
-- Use the consented display name for first-time OAuth signups only.
-- Existing profiles and their own nicknames are never overwritten.
create or replace function public.create_confirmed_signup_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
 if new.email_confirmed_at is null then return new;end if;
 chosen:=btrim(coalesce(nullif(btrim(new.raw_user_meta_data->>'nickname'),''),nullif(btrim(new.raw_user_meta_data->>'preferred_username'),''),nullif(btrim(new.raw_user_meta_data->>'name'),''),nullif(btrim(new.raw_user_meta_data->>'full_name'),''),'Игрок'));
 chosen:=left(chosen,32);
 if char_length(chosen)<2 then chosen:='Игрок';end if;
 insert into public.profiles(id,nickname) values(new.id,chosen) on conflict(id) do nothing;
 return new;
end $$;
commit;
