# Modelo de reparo / kanban (ATP-39)

## Decisão

O kanban de reparos usa a entidade **`Maintenance`** estendida com `status`, em vez de uma ordem de serviço separada neste corte.

| Conceito | Papel |
| --- | --- |
| **Manutenção / reparo (esta entidade)** | Acompanha a execução do serviço no kanban |
| **Orçamento** | Previsão de custo — atividade própria; **não** misturar neste dashboard |
| **Pagamento / fiscal** | Fora de escopo |

Concluir um reparo **não** cria um segundo registro de manutenção. A transição `→ DONE` atualiza o mesmo item.

## Estados

| Status | Coluna UI | Significado |
| --- | --- | --- |
| `TODO` | A fazer | Planejado / aguardando início |
| `IN_PROGRESS` | Em andamento | Em execução |
| `DONE` | Concluído | Serviço realizado |

### Histórico

Registros existentes na migração recebem `DONE` (serviço já realizado). **Não** são reclassificados como pendências.

### Criação

Novos itens via API defaultam para `TODO` (entram no kanban como “A fazer”), a menos que o client envie outro status permitido.

### Datas

`serviceDate` = data prevista (TODO / IN_PROGRESS) ou data do serviço (DONE).  
Atraso / “próximas manutenções” **não** são inferidos só de `createdAt` — indicadores de vencimento ficam de fora até haver regra confirmada.

### Transições (v1)

- `TODO` → `IN_PROGRESS` | `DONE`
- `IN_PROGRESS` → `TODO` | `DONE`
- `DONE` → *(nenhuma; reopen/cancelamento exigem regra futura)*

Mudança de estado só por ação explícita (PATCH). Sem drag-and-drop neste corte.

## Financeiro

Indicadores de custo previsto vs realizado **não** entram no primeiro corte do dashboard (contrato de orçamento separado). `costCents` permanece custo opcional do serviço, sem somar orçamento.
