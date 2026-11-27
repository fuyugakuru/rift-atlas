begin;
create table public.staff_content_reviews(
 kind text not null check(kind in('tip','build')),
 target_id uuid not null,
 content_version timestamptz not null,
 reviewed boolean not null,
 reviewer_id uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz not null default clock_timestamp(),
 primary key(kind,target_id)
);
alter table public.staff_content_reviews enable row level security;
revoke all on public.staff_content_reviews from public,anon,authenticated;
create function public.staff_review_payload(p_kind text,p_id uuid,p_version timestamptz) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('reviewed',r.reviewed and r.content_version=p_version,'outdated',r.reviewed and r.content_version is distinct from p_version,'reviewed_at',r.reviewed_at,'reviewer',coalesce(p.nickname,'Участник команды')) from public.staff_content_reviews r left join public.profiles p on p.id=r.reviewer_id where r.kind=p_kind and r.target_id=p_id),jsonb_build_object('reviewed',false,'outdated',false))
$$;
revoke all on function public.staff_review_payload(text,uuid,timestamptz) from public,anon,authenticated;
create function public.staff_mark_reviewed(p_kind text,p_id uuid,p_version timestamptz,p_reviewed boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare version timestamptz;content jsonb;
begin
 perform public.require_site_staff();
 if p_kind is null or p_kind not in('tip','build') or p_id is null or p_version is null or p_reviewed is null then raise exception 'Invalid review';end if;
 if p_kind='tip' then select updated_at,to_jsonb(t) into version,content from public.matchup_tips t where id=p_id and deleted_at is null for share;
 else select updated_at,to_jsonb(b) into version,content from public.player_builds b where moderation_id=p_id for share;end if;
 if version is null then raise exception 'Content no longer exists';end if;
 if version<>p_version then raise exception 'Content changed. Refresh first';end if;
 insert into public.staff_content_reviews(kind,target_id,content_version,reviewed,reviewer_id) values(p_kind,p_id,version,p_reviewed,auth.uid()) on conflict(kind,target_id) do update set content_version=excluded.content_version,reviewed=excluded.reviewed,reviewer_id=excluded.reviewer_id,reviewed_at=clock_timestamp();
 insert into public.site_moderation_log(actor_id,kind,target_id,action,snapshot) values(auth.uid(),p_kind,p_id::text,case when p_reviewed then 'review' else 'unreview' end,(content-'user_id')||jsonb_build_object('content_version',version));
 return public.staff_review_payload(p_kind,p_id,version);
end $$;
revoke all on function public.staff_mark_reviewed(text,uuid,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.staff_mark_reviewed(text,uuid,timestamptz,boolean) to authenticated;
-- Enrich the staff feed without changing its pagination, moderation filters or staff notes.
do $$declare definition text;updated text;begin
 select pg_get_functiondef('public.staff_content(text,text,text,text,integer)'::regprocedure) into definition;
 updated:=replace(definition,'''updated_at'',updated_at,','''review'',public.staff_review_payload(kind,id,updated_at),''updated_at'',updated_at,');
 if definition=updated then raise exception 'Staff feed shape changed: review field was not added';end if;
 execute updated;
end $$;
notify pgrst,'reload schema';
commit;
