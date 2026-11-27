begin;
alter table public.player_builds drop constraint if exists player_builds_text_length;
alter table public.player_builds add constraint player_builds_text_length check(char_length(title)<=60);
notify pgrst,'reload schema';
commit;
