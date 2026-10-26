# Architecture Decision Records (ADRs)

Processo leve para registrar contexto, alternativas, decisão e consequências técnicas do AutoTrack neste repositório (`autotrack-api`).

## Fonte canônica (decisões transversais)

| Tipo | Onde registrar |
|---|---|
| Escopo **API** | Este repositório (`docs/adr/`) |
| Escopo **Transversal** (API + Mobile) | **Este repositório** como fonte; `autotrack-mobile` apenas referencia (número + título + link) |
| Escopo **Mobile** | `autotrack-mobile` (`docs/adr/` próprio, sequência independente) |

Ao citar uma decisão em outro repo, use: `autotrack-api ADR NNNN — Título`.

## Inventário de documentação existente (ATP-4)

Documentos de implementação (guias), **não** são ADRs — os ADRs apontam para eles sem duplicar:

| Documento | Papel |
|---|---|
| [`README.md`](../../README.md) | Como rodar, contratos HTTP, Compose, Prisma, Render, CI |
| [`docs/auth-and-user-lifecycle.md`](../auth-and-user-lifecycle.md) | Políticas de Auth/perfil (ATP-29/30) |
| [`docs/firebase-providers.md`](../firebase-providers.md) | Provedores Firebase e env Admin SDK |
| [`docs/testing.md`](../testing.md) | Pirâmide de testes e E2E Postgres |
| [`CHANGELOG.md`](../../CHANGELOG.md) | Histórico de entregas (incl. SQLite → PostgreSQL) |

## Índice de ADRs

| ADR | Título | Status | Escopo |
|---|---|---|---|
| [0001](0001-firebase-identity-and-local-profile.md) | Identidade Firebase e perfil local | Aceito | Transversal |
| [0002](0002-postgresql-and-prisma-persistence.md) | Persistência PostgreSQL e Prisma | Aceito | API |
| [0003](0003-api-mobile-boundary-and-contracts.md) | Fronteira API/Mobile e contratos | Aceito | Transversal |

## Backlog de ADRs (não aceitos aqui)

Itens identificados, **separados** das decisões aceitas. Registrar só quando a escolha estiver fechada (ou como **Proposto** com incertezas explícitas):

| Tema | Notas |
|---|---|
| Arquitetura feature-first / módulos no mobile | Escopo mobile |
| Estratégia de state management (mobile) | Escopo mobile |
| Navegação (mobile) | Escopo mobile |
| Geração de client TypeScript a partir do OpenAPI | Transversal; plano em [`../openapi-client-plan.md`](../openapi-client-plan.md) (ATP-12); ADR formal na implementação |
| Soft-delete / anonimização LGPD | API; lifecycle menciona como futuro |
| Exigir `email_verified` em operações sensíveis | API; MVP ainda permite não verificado |

## Processo

### Propor

1. Copie [`template.md`](template.md) para `NNNN-titulo-kebab.md` (próximo número livre nesta sequência).
2. Preencha contexto, restrições, alternativas (ou declare limitação histórica), decisão e consequências.
3. Status inicial: **Proposto**.
4. Abra PR referenciando a task (ex.: `[ATP-4]`).

### Revisar e aceitar

1. Revisar consistência com código e guias existentes.
2. Exigir evidências (links de PR, paths de código, docs) para marcar **Aceito**.
3. Pontos em aberto permanecem **Proposto** ou vão para o backlog acima — não marcar como Aceito.

### Substituir

1. Crie um novo ADR com status **Aceito** (ou **Proposto**).
2. No ADR antigo, altere status para **Substituído** e link para o novo.
3. Não apague o histórico.

### Correções editoriais

Typos e links quebrados podem atualizar o ADR existente sem mudar o número. Mudança de decisão → novo ADR.

### Segurança

Não incluir senhas, tokens, private keys, service accounts ou dados pessoais desnecessários.

## Convenção de arquivos

```text
docs/adr/
├── README.md                 # índice, processo, inventário, backlog
├── template.md
├── 0001-....md
└── 0002-....md
```

- Um ADR = uma decisão (não é manual de instalação).
- Distinguir o que **já está implementado** do que é intenção futura.
- Datas: registrar a data de criação do ADR; citar data original só se conhecida.
