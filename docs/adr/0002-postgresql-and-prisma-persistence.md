# ADR 0002 — Persistência PostgreSQL e Prisma

- **Status:** Aceito
- **Data de registro:** 2026-10-14
- **Decisão original (se conhecida):** SQLite inicial (ATP-18); migração para PostgreSQL (ATP-22 / ATP-23). Datas exatas das escolhas originais desconhecidas além do histórico de commits/CHANGELOG.
- **Owners / revisores:** time AutoTrack
- **Escopo:** API
- **Fonte:** `autotrack-api`

## Contexto e problema

A API precisa de um modelo relacional (User, Vehicle, Maintenance) com migrations versionadas, ambiente local reproduzível e caminho de deploy em serviço managed (demo Render). A modelagem inicial usou SQLite para acelerar o bootstrap; o runtime atual exige um banco compatível com deploy e testes E2E isolados.

## Restrições relevantes

- ORM e migrations via **Prisma** (atualmente Prisma 7 + adapter `pg`).
- Ambiente local via **Docker Compose** (PostgreSQL 16).
- Deploy demo no **Render** com Postgres managed (filesystem efêmero — SQLite inadequado online).
- E2E precisa de isolamento sem contaminar o banco de desenvolvimento.
- Sem inventar justificação retroativa além do registrado em CHANGELOG/docs/testing.

## Alternativas consideradas

| Alternativa | Por que não (ou histórico) |
|---|---|
| Permanecer em SQLite | Adequado ao bootstrap (ATP-18), inadequado para Render/demo e para o adapter Postgres atual; CHANGELOG registra a migração em ATP-22. |
| TypeORM / outro ORM | Não há registro de avaliação formal na época; Prisma foi adotado desde a modelagem inicial. |
| Banco NoSQL | Domínio relacional (ownership 1:N) e migrations SQL alinham melhor com PostgreSQL. |

> Limitação: critérios de escolha do Prisma vs outros ORMs não foram documentados em ADR na época. Este registro descreve o estado aceito e a evolução SQLite → PostgreSQL com evidência.

## Decisão

1. **PostgreSQL** é o banco de runtime da API (local Docker, CI, Render).
2. **Prisma** permanece como ORM e ferramenta de migrations (`prisma/migrations`).
3. O histórico da modelagem inicial em SQLite permanece no CHANGELOG; não se reescreve o passado.
4. E2E usa banco dedicado (`autotrack_e2e` / `E2E_DATABASE_URL`), não o banco de desenvolvimento.
5. Variáveis de conexão e SSL de produção ficam em env / secret manager — nunca no repositório.

## Consequências

### Positivas

- Paridade local ↔ CI ↔ demo com o mesmo motor SQL.
- Migrations versionadas e aplicáveis com `prisma migrate deploy`.
- Health check pode validar conectividade Postgres (`GET /v1/health`).
- CASCADE e constraints únicos (`email`, `firebaseUid`, `document`, `cnh`) ficam no schema.

### Custos, riscos e limitações

- Dependência de Docker (ou Postgres externo) para desenvolver e rodar E2E.
- Prisma 7 + driver adapter exige configuração explícita (`DATABASE_URL`, SSL em managed).
- Containers Compose precisam compartilhar rede (hostname `postgres`); falhas de rede geram `P1001`.
- Artefatos `*.db` antigos podem existir no gitignore, mas não são o runtime.

## Plano de adoção / migração

Já adotado:

- `provider = "postgresql"` em `prisma/schema.prisma`
- Compose com serviço `postgres` + `DATABASE_URL` interno `postgres:5432`
- Documentação de E2E em [`docs/testing.md`](../testing.md)
- Nota no README: não usar SQLite no Render

Não há rollback planejado para SQLite.

## Referências

- [`docs/testing.md`](../testing.md) — isolamento E2E pós-migração
- `prisma/schema.prisma`, `prisma/migrations/`, `docker-compose.yml`, `render.yaml`
- `src/prisma/prisma.service.ts` (`@prisma/adapter-pg`)
- Tasks: ATP-18 (SQLite inicial), ATP-22 (PostgreSQL + health), ATP-23 (Docker Compose)
- CHANGELOG: entradas ATP-18 / ATP-22
