begin;
create or replace function public.my_matchup_reports(p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare me uuid:=auth.uid();start_at integer:=least(greatest(coalesce(p_offset,0),0),10000);
begin
 if me is null then raise exception 'Sign in required';end if;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r)) from(select id,champion,opponent,lane,patch,rank,won,played_at,status,review_note from public.matchup_results where user_id=me and deleted_at is null order by played_at desc,id limit 10 offset start_at)r),'[]'::jsonb),
 'has_more',(select count(*)>start_at+10 from public.matchup_results where user_id=me and deleted_at is null));
end $$;
revoke all on function public.my_matchup_reports(integer) from public,anon;
grant execute on function public.my_matchup_reports(integer) to authenticated;
notify pgrst,'reload schema';
commit;
