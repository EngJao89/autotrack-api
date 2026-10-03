# Autotrack API

[![CI](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml/badge.svg)](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml)

API REST em **NestJS** + **TypeScript** para um sistema de rastreamento veicular. Projeto de portfólio focado em boas práticas de arquitetura, tipagem e versionamento.

> Status atual: Prisma + SQLite para o schema; PostgreSQL local via Docker Compose disponível para a próxima migração.

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS 12 | Framework HTTP e organização modular |
| TypeScript | Tipagem estática |
| Swagger/OpenAPI | Documentação da API (`/api/docs`) |
| Prisma 7 | ORM e migrations |
| SQLite | Datasource temporário do Prisma (local) |
| PostgreSQL 16 | Banco relacional via Docker Compose |
| Jest + Supertest | Testes unitários e e2e |
| Oxlint + Prettier | Lint e formatação |
| GitHub Actions | Integração contínua |
| Commitizen | Commits no padrão Conventional Commits |

## Pré-requisitos

- Node.js 24+ (recomendado; mínimo 24.9 para os testes com Jest + ESM)
- npm
- Docker + Docker Compose

## Como rodar

```bash
# instalar dependências (também executa prisma generate via postinstall)
npm install

# copiar variáveis de ambiente
cp .env.example .env

# subir API (NestJS watch) + PostgreSQL
docker compose up -d --build

# aplicar migrations no SQLite local (Prisma ainda usa SQLite nesta etapa)
npx prisma migrate dev

# desenvolvimento (watch mode)
npm run start:dev

# build de produção
npm run build
npm run start:prod
```

A API sobe em `http://localhost:3333` por padrão (`PORT` / `API_PORT` no `.env`).

Rotas versionadas usam o prefixo **`/v1`** (ex.: `GET /v1/health`).

## Documentação OpenAPI (Swagger)

A UI do Swagger fica em:

- Local: [http://localhost:3333/api/docs](http://localhost:3333/api/docs)

Controle por ambiente:

- Habilitada por padrão quando `NODE_ENV !== production`
- Force com `SWAGGER_ENABLED=true` ou `false` no `.env`

Tags de domínio já registradas: `Auth`, `Users`, `Vehicles`, `Maintenance` (+ `Health`).

```bash
npm run start:dev
# abra http://localhost:3333/api/docs
```

## Docker Compose (API + PostgreSQL)

Ambiente local com **NestJS em modo watch** e **PostgreSQL**. Credenciais e portas vêm do `.env` (use `.env.example` como base). O arquivo `.env` não é versionado.

```bash
# iniciar API + Postgres
docker compose up -d --build

# status (aguardar postgres healthy e api up)
docker compose ps

# logs da API
docker compose logs -f api

# logs do Postgres
docker compose logs -f postgres

# parar
docker compose down
```

- API: `http://localhost:3333` (ajuste `PORT` no `.env`)
- Swagger: `http://localhost:3333/api/docs`
- Health: `http://localhost:3333/v1/health`
- Postgres no host: porta `5433` → `5432` do container (ajuste `POSTGRES_PORT` se necessário)

Teste rápido do banco:

```bash
docker compose exec postgres psql -U autotrack -d autotrack -c 'SELECT 1;'
```

> O volume `postgres_data` persiste os dados do Postgres entre `up`/`down`.  
> O Prisma ainda usa **SQLite** dentro do container da API nesta etapa; a migração para PostgreSQL fica para task dedicada.

## Banco de dados (Prisma + SQLite)

O datasource atual do Prisma ainda usa **SQLite** (`DATABASE_URL=file:./dev.db`) para validação do schema. O PostgreSQL via Docker já está disponível; a troca do provider Prisma ocorrerá em task dedicada.

### Models iniciais

- `User` → possui vários `Vehicle`
- `Vehicle` → possui várias `Maintenance`
- Relacionamentos com FK e `onDelete: Cascade`

### Comandos úteis

```bash
# criar/aplicar migrations em desenvolvimento
npx prisma migrate dev

# gerar o Prisma Client
npx prisma generate

# abrir o Prisma Studio (UI para inspecionar dados)
npx prisma studio
```

Scripts npm equivalentes: `npm run prisma:migrate`, `npm run prisma:generate`, `npm run prisma:studio`.

> O arquivo local `dev.db` não é versionado no Git.

## Integração contínua

A cada push e pull request nas branches `main`/`master`, o GitHub Actions executa:

1. Instalação determinística (`npm ci` + `prisma generate`)
2. Application das migrations (`prisma migrate deploy`)
3. Lint
4. Typecheck
5. Testes unitários e e2e
6. Build

Comandos locais equivalentes:

```bash
npm ci
npx prisma migrate deploy
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Scripts úteis

```bash
npm run start:dev       # sobe a API em modo watch
npm run build           # compila para dist/
npm run lint            # analisa o código com Oxlint
npm run typecheck       # verifica tipagem TypeScript
npm run format          # formata com Prettier
npm run test            # testes unitários
npm run test:e2e        # testes end-to-end
npm run test:cov        # cobertura de testes
npm run prisma:migrate  # migrations de desenvolvimento
npm run prisma:generate # gera o Prisma Client
npm run prisma:studio   # abre o Prisma Studio
npm run commit          # commit assistido (Commitizen)
```

## Arquitetura

Estrutura inicial gerada pelo NestJS, com organização modular:

```text
src/
├── main.ts                 # bootstrap, prefixo /v1 e Swagger
├── config/swagger.ts       # DocumentBuilder + setup /api/docs
├── common/dto/             # schemas de erro documentados
├── health/                 # GET /v1/health
├── users/dto/              # DTOs de exemplo (schemas OpenAPI)
├── app.module.ts
├── prisma/
└── generated/prisma/
prisma/
├── schema.prisma
└── migrations/
docker-compose.yml
```

À medida que o domínio evoluir, os módulos de negócio (ex.: veículos, manutenções, autenticação) devem ficar isolados em pastas próprias sob `src/`, seguindo o padrão de módulos do NestJS.

## Commits

Este repositório usa [Conventional Commits](https://www.conventionalcommits.org/) via Commitizen:

```bash
npm run commit
```

## Licença

Projeto privado / não licenciado (`UNLICENSED`).
