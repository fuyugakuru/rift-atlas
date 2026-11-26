begin;
do $$declare target uuid;begin
 select id into target from public.profiles where public_id='db010422-cc70-4140-b0ca-74c26e8ddaa9';
 if target is null then raise exception 'Owner profile not found';end if;
 insert into public.site_staff(user_id,role) values(target,'admin') on conflict(user_id) do update set role='admin';
end $$;
commit;
