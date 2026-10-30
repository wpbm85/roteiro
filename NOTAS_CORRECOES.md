# Correções do app — outubro de 2026

1. Nova categoria de roteiro `TREM`, separada de `ESTAÇÃO`.
   - `ESTAÇÃO` continua mapeada para `TRANSPORTE` no orçamento.
   - `TREM` é mapeada para `TREM` no orçamento.
   - Ambas usam ícone de trem e a caixa “Destacar no Calendário” para indicar transições no calendário.
2. Calendário: itens comuns com a mesma cidade não repetem a cidade no mesmo dia. Retornos/etapas de transporte devem ser registrados como `TREM` ou `ESTAÇÃO` e destacados no calendário quando precisarem aparecer como transição.
3. Referência de custos do roteiro no orçamento: normalização mais tolerante de categoria/cidade e conversão de custos importados em texto, para não deixar de mostrar custos de museus em `INGRESSOS` por diferenças de formato.

A referência de custos do roteiro continua sendo informativa e não é somada automaticamente ao orçamento.
