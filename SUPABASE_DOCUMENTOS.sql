-- Europa 2027 | Aba Documentos | executar uma única vez no Supabase SQL Editor

-- Bucket privado (1 GB da franquia Free; limite por arquivo = 10 MB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reservas','reservas',false,10485760,array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=array['application/pdf','image/jpeg','image/png'];

-- Tabela de metadados. roteiro_id como texto evita dependência do tipo do ID legado.
create table if not exists public.documentos (
 id uuid primary key default gen_random_uuid(),
 nome text not null, nome_arquivo text not null, caminho_arquivo text not null unique,
 mime_type text not null, tamanho_bytes bigint not null,
 categoria text not null check (categoria in ('HOTEL','INGRESSOS','OUTROS','TREM','VOO')),
 cidade text not null check (cidade in ('GERAL','AMSTERDAM','BRUXELAS','GENT','BRUGES','PARIS','ROTERDAM','DELFT','HAIA')),
 roteiro_id text null, roteiro_categoria text null, roteiro_atracao text null,
 created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create index if not exists documentos_roteiro_id_idx on public.documentos(roteiro_id);
create index if not exists documentos_categoria_cidade_idx on public.documentos(categoria,cidade);
alter table public.documentos enable row level security;

-- Acesso compartilhado para qualquer usuário autenticado do app familiar.
drop policy if exists documentos_select_authenticated on public.documentos;
create policy documentos_select_authenticated on public.documentos for select to authenticated using (true);
drop policy if exists documentos_insert_authenticated on public.documentos;
create policy documentos_insert_authenticated on public.documentos for insert to authenticated with check (auth.uid() is not null and created_by=auth.uid());
drop policy if exists documentos_delete_authenticated on public.documentos;
create policy documentos_delete_authenticated on public.documentos for delete to authenticated using (auth.uid() is not null);

drop policy if exists documentos_update_authenticated on public.documentos;
create policy documentos_update_authenticated on public.documentos for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

-- Storage: bucket privado, acessível somente após login no app.
drop policy if exists reservas_select_authenticated on storage.objects;
create policy reservas_select_authenticated on storage.objects for select to authenticated using (bucket_id='reservas');
drop policy if exists reservas_insert_authenticated on storage.objects;
create policy reservas_insert_authenticated on storage.objects for insert to authenticated with check (bucket_id='reservas' and auth.uid() is not null);
drop policy if exists reservas_delete_authenticated on storage.objects;
create policy reservas_delete_authenticated on storage.objects for delete to authenticated using (bucket_id='reservas' and auth.uid() is not null);

-- Permissões SQL da tabela para o papel autenticado (RLS continua sendo aplicada).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.documentos to authenticated;
