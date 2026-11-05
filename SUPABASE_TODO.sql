-- Europa 2027 | To-do list | executar uma única vez no Supabase SQL Editor

create table if not exists public.todos (
 id uuid primary key default gen_random_uuid(),
 chave text unique null,
 titulo text not null,
 nota text null,
 data_alvo date null,
 feito boolean not null default false,
 feito_em timestamptz null,
 ordem bigint not null default (extract(epoch from now()) * 1000)::bigint,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now()
);
alter table public.todos enable row level security;

drop policy if exists todos_select_authenticated on public.todos;
create policy todos_select_authenticated on public.todos for select to authenticated using (true);
drop policy if exists todos_insert_authenticated on public.todos;
create policy todos_insert_authenticated on public.todos for insert to authenticated with check (auth.uid() is not null);
drop policy if exists todos_update_authenticated on public.todos;
create policy todos_update_authenticated on public.todos for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists todos_delete_authenticated on public.todos;
create policy todos_delete_authenticated on public.todos for delete to authenticated using (auth.uid() is not null);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.todos to authenticated;
