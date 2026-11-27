begin;
-- The senior title is separate from the authorization role: existing admin-only
-- APIs keep working and ordinary profile edits cannot grant either field.
alter table public.site_staff add column staff_title text check(staff_title is null or (staff_title='head_admin' and role='admin'));
create unique index site_single_head_administrator on public.site_staff(staff_title) where staff_title='head_admin';
create function public.site_staff_title() returns text language sql stable security definer set search_path='' as $$
 select coalesce(staff_title,role) from public.site_staff where user_id=auth.uid()
$$;
revoke all on function public.site_staff_title() from public,anon,authenticated;
grant execute on function public.site_staff_title() to authenticated;
create or replace function public.public_staff_badge(p_profile uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce(s.staff_title,s.role) from public.site_staff s join public.profiles p on p.id=s.user_id where p.public_id=p_profile
$$;
create or replace function public.staff_team() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 perform public.require_site_staff(true);
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.public_id,'nickname',p.nickname,'avatar',p.avatar,'role',s.role,'title',coalesce(s.staff_title,s.role)) order by (s.staff_title='head_admin') desc nulls last,s.role,p.nickname) from public.site_staff s join public.profiles p on p.id=s.user_id),'[]'::jsonb);
end $$;
create or replace function public.staff_note_payload(p_kind text,p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('body',n.body,'role',n.actor_role,'title',coalesce((select staff_title from public.site_staff where user_id=n.actor_id),n.actor_role),'author',p.nickname,'profile_id',p.public_id,'updated_at',n.updated_at,'outdated',n.content_version is distinct from case when n.kind='tip' then (select updated_at from public.matchup_tips where id=n.target_id) else (select updated_at from public.player_builds where moderation_id=n.target_id) end)
 from public.site_staff_notes n join public.profiles p on p.id=n.actor_id where n.kind=p_kind and n.target_id=p_id
$$;
-- Exact profile confirmed by the owner. No nickname-only mass assignment.
do $$declare target uuid;begin
 select id into strict target from public.profiles where public_id='295f1c45-876f-41de-b293-f528d50ffdca'::uuid and lower(btrim(nickname))='fuyugakuru';
 insert into public.site_staff(user_id,role,staff_title) values(target,'admin','head_admin') on conflict(user_id) do update set role='admin',staff_title='head_admin';
end $$;
notify pgrst,'reload schema';
commit;
