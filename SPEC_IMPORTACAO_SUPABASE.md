# Spec de importação — Europa 2027 (Supabase)

Cole este documento junto com o export da planilha (Google Sheets) sempre que pedir pra uma IA gerar SQL/CSV de importação. Ele reflete o estado atual do app (schema + regras de negócio).

---

## Tabela `roteiro`

| Coluna | Tipo | Regra |
|---|---|---|
| `dia` | text | **Formato exato:** `"DD/MM XXX"` — ex: `"10/05 SEG"`. XXX é a abreviação do dia da semana em português (SEG/TER/QUA/QUI/SEX/SÁB/DOM) ou inglês (MON/TUE/WED/THU/FRI/SAT/SUN — o app traduz sozinho). **Não usar data real do Excel/Sheets** — precisa ser texto nesse formato, senão o app não agrupa/ordena os dias certo. |
| `cidade` | text | Um destes, maiúsculo: `GERAL, AMSTERDAM, BRUXELAS, GENT, BRUGES, PARIS, ROTERDAM, DELFT, HAIA` |
| `regiao` | text | Livre (bairro/zona) |
| `ordem` | int | Posição dentro do dia (1, 2, 3...) |
| `categoria` | text | Um destes: `AEROPORTO, DESTAQUE, ESTAÇÃO, HOTEL, LOJA, MUSEU, PARQUE, RESTAURANTE, OUTRO` |
| `atracao` | text | Nome da atração/atividade |
| `funcionamento` | text | Livre, ex: `"9-18h"` |
| `endereco` | text | Livre |
| `custo` | numeric | Em EUR. `0` se gratuito |
| `link` | text | URL do Google Maps (opcional) |
| `obs` | text | Livre (opcional) |
| `feito` | bool | `false` por padrão |
| `hora` | text | Formato `"HH:MM"`, ex: `"09:30"` |

---

## Tabela `orcamento`

| Coluna | Tipo | Regra |
|---|---|---|
| `categoria` | text | Um destes: `VOO, TREM, HOTEL, ALIMENTAÇÃO, INGRESSOS, TRANSPORTE, COMPRAS, MERCADO, OUTROS` |
| `cidade` | text | Mesma lista de cidades do Roteiro. **Não deixar em branco** — vira "GERAL" automaticamente, e some no grupo errado se a cidade real não for GERAL |
| `item` | text | Descrição (ex: "HOTEL PARIS", "Museu do Louvre") |
| `status` | text | Só `A PAGAR` ou `PROJETADO`. **Nunca inserir `PAGO` manualmente** — esse status agora é automático: aparece sozinho quando existe um gasto real vinculado (via `orcamento_id` na tabela `gastos`) |
| `moeda` | text | `EUR` ou `BRL` — indica em que moeda o valor abaixo foi pensado |
| `projetado_eur` | numeric | **Sempre em EUR**, mesmo que `moeda` seja BRL (já convertido) |

---

## Tabela `gastos`

| Coluna | Tipo | Regra |
|---|---|---|
| `data` | date | Formato `YYYY-MM-DD` |
| `cidade` | text | Mesma lista de cidades |
| `categoria` | text | Mesma lista de categorias financeiras do Orçamento |
| `item` | text | Descrição do gasto |
| `moeda` | text | `EUR` ou `BRL` |
| `valor_eur` | numeric | Valor em EUR |
| `valor_brl` | numeric | Valor em BRL (mesma quantia, convertida) |
| `orcamento_id` | int8 (opcional) | ID da linha correspondente em `orcamento`, **se** esse gasto quita/comprova um item já orçado. Deixe `null` pra gasto avulso (sem orçamento prévio) |

**Sobre o `orcamento_id`:** é a chave que faz o item de orçamento virar "PAGO" automaticamente e somar o valor real. Pra descobrir o ID certo, rode antes:
```sql
select id, categoria, cidade, item from orcamento order by categoria, cidade;
```
e usa o ID daquela linha específica no `orcamento_id` do gasto correspondente.

---

## Dica

Se preferir, pode colar os dados exportados da planilha direto nesta conversa (as 3 abas) que eu mesmo já gero o SQL de INSERT pronto, já validando os formatos acima — sem precisar de outra IA no meio.
