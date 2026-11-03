# Correções do app — novembro de 2026

1. Categoria `DESTAQUE` e registros legados `MARCO` passam a ser associados à categoria financeira `INGRESSOS` na referência de custos do roteiro.
2. Mantidas as correções anteriores: categoria `TREM`, distinção entre `ESTAÇÃO` e `TREM`, consolidação de cidades no calendário e normalização de custos/categorias.

A referência de custos do roteiro continua sendo informativa e não é somada automaticamente ao orçamento.

## Observação sobre Haia em 26/05

A exibição de `HAIA` em 26/05 depende da data (`dia`) gravada no registro correspondente no Supabase. O código não deve apagar ou deslocar automaticamente uma cidade, pois isso poderia ocultar uma visita legítima. Se o registro de Haia estiver com `dia = 26/05`, ajuste esse registro para `25/05` no próprio roteiro. Se todos os registros de Haia já estiverem em 25/05, será necessário inspecionar os registros e a ordenação para corrigir a origem do rótulo.
