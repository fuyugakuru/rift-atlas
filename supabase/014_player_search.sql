begin;
create or replace function public.search_players(p_query text,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare needle text:=lower(btrim(coalesce(p_query,''))); start_at integer:=least(greatest(coalesce(p_offset,0),0),1000); result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if char_length(needle)<2 or char_length(needle)>32 then return jsonb_build_object('total',0,'has_more',false,'players','[]'::jsonb); end if;
 with chosen as (select p.public_id,p.nickname,p.avatar,case when lower(p.nickname)=needle then 0 when strpos(lower(p.nickname),needle)=1 then 1 else 2 end priority from public.profiles p where strpos(lower(p.nickname),needle)>0),
 page as (select * from chosen order by priority,lower(nickname),public_id offset start_at limit 12)
 select jsonb_build_object('total',(select count(*) from chosen),'has_more',(select count(*) from chosen)>start_at+12 and start_at<1000,'players',coalesce((select jsonb_agg(jsonb_build_object('id',public_id,'nickname',nickname,'avatar',avatar) order by priority,lower(nickname),public_id) from page),'[]'::jsonb)) into result;
 return result;
end $$;
revoke all on function public.search_players(text,integer) from public,anon;
grant execute on function public.search_players(text,integer) to authenticated;
notify pgrst,'reload schema';
commit;
