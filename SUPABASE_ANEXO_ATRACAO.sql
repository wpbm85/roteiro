-- Europa 2027 | Atrações: opção "Habilitar anexo" | executar uma única vez no Supabase SQL Editor

alter table public.roteiro add column if not exists anexo boolean not null default false;

-- Mantém o clipe nas atrações que já têm documento vinculado.
update public.roteiro set anexo = true
where id::text in (select roteiro_id from public.documentos where roteiro_id is not null);
