-- Europa 2027 | Documentos: marcar como resolvido (check) | executar uma única vez no Supabase SQL Editor
-- Requer a permissão de edição (SUPABASE_DOCUMENTOS_EDICAO.sql). Não altera documentos existentes.

alter table public.documentos add column if not exists feito boolean not null default false;
