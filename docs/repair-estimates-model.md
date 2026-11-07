# Modelo de orçamento de reparo (ATP-38)

## Decisão

Orçamento (`RepairEstimate`) é **estimativa de serviço/custo**, entidade própria vinculada ao veículo.  
**Não** reutiliza `Maintenance` nem `Maintenance.costCents`. Salvar orçamento **não** cria manutenção.

| Conceito | Papel |
| --- | --- |
| **RepairEstimate** | Cabeçalho: título, descrição, moeda, status, `totalCents` (calculado) |
| **RepairEstimateItem** | Linha: descrição, categoria peça/mão de obra, quantidade, preço unitário |
| **Maintenance** | Serviço realizado / kanban (ATP-39) — domínio separado |

## Estados

| Status | Significado |
| --- | --- |
| `DRAFT` | Em elaboração; conteúdo editável |
| `FINALIZED` | Congelado; só muda via transição de status |
| `ARCHIVED` | Terminal; só leitura / exclusão hard |

### Transições (v1)

- `DRAFT` → `FINALIZED` \| `ARCHIVED`
- `FINALIZED` → `DRAFT` (reabrir) \| `ARCHIVED`
- `ARCHIVED` → *(nenhuma)*

Criação sempre entra como `DRAFT`.

## Monetário

- Moeda MVP: **`BRL`** apenas (`currency` default `"BRL"`).
- Quantidade: inteiro ≥ 1.
- `unitPriceCents`: inteiro ≥ 0 (zero permitido).
- Limite de preço unitário: ≤ `100_000_000` (R$ 1.000.000,00).
- Máximo de itens por orçamento: **50**.
- `lineTotalCents` = `quantity * unitPriceCents` (inteiro exato).
- `totalCents` = soma dos `lineTotalCents` — **autoridade só no backend**; total enviado pelo client é ignorado.

## Edição e consistência

- Título / descrição / itens: somente com status `DRAFT`.
- Em `FINALIZED` / `ARCHIVED`, PATCH de conteúdo → `400` `ESTIMATE_NOT_EDITABLE`.
- Replace de itens é **transacional** (`deleteMany` + `createMany` + update do cabeçalho). Falha em item = rollback total.
- Concorrência: `updatedAt` no response; **sem** optimistic lock neste corte.

## Exclusão e veículo

- `DELETE /v1/estimates/:id`: remoção hard (cascade nos itens).
- Arquivar = `PATCH` com `status: ARCHIVED`.
- Remoção do veículo: `onDelete: Cascade` nos orçamentos (igual manutenções).

## Autorização

Ownership pelo `vehicle.userId`. Conta B recebe `404` genérico (não vaza existência).

## Rotas

| Método | Rota | Uso |
| --- | --- | --- |
| `POST` | `/v1/vehicles/:vehicleId/estimates` | Criar |
| `GET` | `/v1/vehicles/:vehicleId/estimates` | Listar do veículo |
| `GET` | `/v1/estimates` | Listar do usuário (`?vehicleId=&status=`) |
| `GET` | `/v1/estimates/:id` | Detalhe |
| `PATCH` | `/v1/estimates/:id` | Editar / mudar status |
| `DELETE` | `/v1/estimates/:id` | Remover |

## Fora de escopo

Pagamentos, fiscal, estoque, oficina, aprovação multiusuário, anexos, conversão automática para manutenção, offline-first.
