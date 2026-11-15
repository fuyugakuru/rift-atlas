-- Второй ключ того же предмета сохраняется в справочнике, но недоступен для выбора.
alter table public.build_catalog add column if not exists enabled boolean not null default true;
update public.build_catalog set enabled=false where id='item:Lord Dominik''s Regards';
