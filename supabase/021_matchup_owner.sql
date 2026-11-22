begin;
do $$
declare target uuid;
begin
 select id into target from public.profiles where public_id='db010422-cc70-4140-b0ca-74c26e8ddaa9'::uuid;
 if target is null then raise exception 'Owner profile not found. No permissions changed.';end if;
 insert into public.matchup_reviewers(user_id) values(target) on conflict do nothing;
end $$;
commit;
