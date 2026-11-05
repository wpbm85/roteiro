-- Europa 2027 | Editar documentos | executar uma única vez no Supabase SQL Editor
-- (somente quem já executou o SUPABASE_DOCUMENTOS.sql original; não altera dados existentes)

drop policy if exists documentos_update_authenticated on public.documentos;
create policy documentos_update_authenticated on public.documentos
  for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

grant update on public.documentos to authenticated;
