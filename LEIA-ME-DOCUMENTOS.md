# Aba Documentos — Europa 2027

## O que foi incluído
- Nova aba **Documentos** com filtros por categoria e cidade.
- Categorias: HOTEL, INGRESSOS, OUTROS, TREM e VOO.
- Cidades: GERAL, AMSTERDAM, BRUXELAS, GENT, BRUGES, PARIS, ROTERDAM, DELFT e HAIA.
- Upload de PDF, JPG e PNG, até 10 MB por arquivo.
- Associação opcional a itens do roteiro das categorias AEROPORTO, DESTAQUE/MARCO, TREM, HOTEL, MUSEU e OUTRO.
- Clipe discreto nos cartões elegíveis do roteiro; fica destacado quando há arquivo associado e abre a lista filtrada.
- Visualização/download por URL temporária; bucket não público.

## Novidades desta versão
- Botão de lápis em cada documento: edita título, categoria, cidade e vínculo; arquivo opcionalmente substituído (se não escolher outro, o original é mantido).
- Lista de vínculo organizada por DATA › CIDADE › ATRAÇÃO.
- Filtros da aba no formato de chips (igual ao Orçamento); ao vir pelo clipe, o filtro aparece como uma etiqueta compacta com ×.
- **Requer 1 SQL extra:** `SUPABASE_DOCUMENTOS_EDICAO.sql` (permissão de UPDATE na tabela). Quem ainda não instalou nada roda só o `SUPABASE_DOCUMENTOS.sql`, que já o inclui.

## Ajustes desta versão
- Clipe ativo no roteiro: preenchido com a cor da categoria do cartão (igual ao botão de rota).
- Aba Documentos: removido o quadro descritivo; ícones dos arquivos usam a cor da categoria (INGRESSOS = cor de DESTAQUE).
- **To-do list:** ícone de check no cabeçalho, entre Excel e Sair (clique de novo para voltar à aba anterior). Itens riscam e descem para "Concluídos"; é possível editar (título, data-alvo, observação) e excluir.
- Na primeira abertura, a lista é preenchida uma única vez com sugestões: ETIAS (Carol), atualização de valores de transporte e, a partir do roteiro, bilhetes de trem e ingressos de museus/destaques com custo e sem documento anexado. As datas-alvo são sugestões editáveis (45 dias antes da visita para ingressos, 60 para trens e ETIAS).
- **Requer 1 SQL extra:** `SUPABASE_TODO.sql`.

## Instalação Supabase (obrigatória antes do uso)
1. Abra o projeto Supabase usado pelo app.
2. Entre em **SQL Editor** → **New query**.
3. Abra `SUPABASE_DOCUMENTOS.sql`, copie todo o conteúdo e execute com **Run**.
4. Confirme em **Storage** que existe o bucket `reservas` e que está marcado como **Private**.
5. Em **Table Editor**, confirme a tabela `documentos`.

As políticas deste SQL compartilham os documentos entre todos os usuários autenticados que conseguem entrar neste app familiar. Não tornam o bucket público. Se o projeto permitir que pessoas desconhecidas criem contas, restrinja o cadastro/login antes de usar documentos privados.

## Publicação do app
1. Substitua no GitHub os arquivos do projeto pelos desta versão, preservando a estrutura da pasta.
2. Faça commit/push.
3. Abra o app e faça recarga forçada (Ctrl+F5) ou limpe o cache do PWA.
4. Teste primeiro com um PDF pequeno: envie, abra, baixe e exclua.

## Observações
- Nenhum documento é incluído no Excel; os arquivos ficam no Supabase Storage e os metadados na tabela `documentos`.
- O app gera links assinados válidos por 60 segundos para abrir/baixar os arquivos.
- A cópia local/offline dos bilhetes importantes continua recomendada.
- A associação ao roteiro usa o ID como texto e não altera a tabela `roteiro`.
