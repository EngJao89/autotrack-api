# Autotrack API

[![CI](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml/badge.svg)](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml)

API REST em **NestJS** + **TypeScript** para um sistema de rastreamento veicular. Projeto de portfólio focado em boas práticas de arquitetura, tipagem e versionamento.

> Status atual: Prisma + PostgreSQL; Auth Firebase; Vehicles/Maintenance; validação/erros padronizados; health check; pronto para demo no Render.

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS 12 | Framework HTTP e organização modular |
| TypeScript | Tipagem estática |
| Firebase Admin | Validação de ID Tokens (Auth) |
| Swagger/OpenAPI | Documentação da API (`/api/docs`) |
| Prisma 7 | ORM e migrations |
| PostgreSQL 16 | Banco relacional (Docker / managed) |
| NestJS Terminus | Health checks |
| Render | Deploy de demonstração (Web Service) |
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

# subir PostgreSQL (+ API, se preferir via Docker)
docker compose up -d --build

# aplicar migrations no PostgreSQL
npx prisma migrate dev

# desenvolvimento local (host)
npm run start:dev

# build de produção
npm run build
npm run start:prod
```

A API sobe em `http://localhost:3333` por padrão (`PORT` / `API_PORT` no `.env`).

Rotas versionadas usam o prefixo **`/v1`** (ex.: `GET /v1/health`).

## Health check

`GET /v1/health` valida a API e a conectividade com o PostgreSQL (sem alterar dados de negócio).

```bash
curl http://localhost:3333/v1/health
```

Resposta saudável (HTTP 200):

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

Se o banco estiver indisponível, a API responde **HTTP 503** com `status: "error"` e o indicador `database` em `down`. O endpoint também aparece no Swagger em `/api/docs`.

## Validação e erros (contrato)

A API usa `ValidationPipe` global com:

- `transform: true` — conversão controlada de tipos
- `whitelist: true` — remove propriedades não declaradas no DTO
- `forbidNonWhitelisted: true` — rejeita campos extras com HTTP 400

DTOs de User, Vehicle e Maintenance usam `class-validator` + decorators Swagger. Campos como `id`, `userId`, `vehicleId`, `createdAt` e `updatedAt` não entram nos payloads de criação/atualização.

Todas as respostas de erro seguem:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "field": "email",
      "messages": ["email must be an email"]
    }
  ],
  "requestId": "9f3c2b1a-4d5e-6789-abcd-ef0123456789"
}
```

Códigos estáveis principais: `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR` (+ códigos Auth `AUTH_TOKEN_*`).

- Header `X-Request-Id` é aceito; se ausente, a API gera um UUID e devolve no response header
- Erros `500` são genéricos para o client; detalhes técnicos ficam só nos logs (sem stack/SQL/tokens)

## Auth (Firebase)

A API **não** armazena senha nem emite JWT próprio. O app Expo autentica no Firebase e envia o ID Token:

```http
Authorization: Bearer <firebase-id-token>
```

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/v1/auth/me` | Retorna `userId` (UID Firebase) e `email` do token |

Variáveis no `.env` (service account; nunca versionar valores reais):

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Se a private key vier com quebras de linha, mantenha-as escapadas como `\n` no `.env`.

```bash
# token ausente → 401 AUTH_TOKEN_MISSING
curl http://localhost:3333/v1/auth/me

# token válido → 200
curl http://localhost:3333/v1/auth/me \
  -H "Authorization: Bearer <firebase-id-token>"
```

Respostas de erro (sem token, stack ou detalhes internos):

```json
{
  "statusCode": 401,
  "code": "AUTH_TOKEN_MISSING",
  "message": "Authentication token is required"
}
```

```json
{
  "statusCode": 401,
  "code": "AUTH_TOKEN_INVALID",
  "message": "Authentication token is invalid or expired"
}
```

No Swagger (`/api/docs`), use o botão **Authorize** e cole o Firebase ID Token.

Para proteger outros endpoints: `@UseGuards(AuthGuard)` + `@ApiBearerAuth('bearer')` e, se precisar do usuário, `@CurrentUser()`.

## Users

Perfil local (sem senha). Decisões de auth/ciclo de vida: [`docs/auth-and-user-lifecycle.md`](docs/auth-and-user-lifecycle.md).

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/v1/users` | — | Cria usuário (`email` obrigatório, `name` opcional) |
| `GET` | `/v1/users/:id` | — | Busca usuário por id |
| `PUT` | `/v1/users/:id` | `X-User-Id` | Substitui perfil mutável (omitidos → `null`) |
| `PATCH` | `/v1/users/:id` | `X-User-Id` | Atualização parcial |
| `DELETE` | `/v1/users/:id` | `X-User-Id` | Exclusão física (+ cascade de veículos) |

Campos de perfil: `name`, `cnh`, `document`, `documentType` (`CPF`/`CNPJ`), `phone`.

```bash
# criar
curl -X POST http://localhost:3333/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","name":"Example User"}'

# substituir perfil (somente o próprio id)
curl -X PUT http://localhost:3333/v1/users/<id> \
  -H 'Content-Type: application/json' \
  -H "X-User-Id: <id>" \
  -d '{"name":"Nome do usuário","document":"52998224725","documentType":"CPF","phone":"+5511999999999","cnh":"10000000091"}'

# patch
curl -X PATCH http://localhost:3333/v1/users/<id> \
  -H 'Content-Type: application/json' \
  -H "X-User-Id: <id>" \
  -d '{"phone":"+5511987654321"}'
```

- E-mail único; `document` e `cnh` únicos quando preenchidos; `phone` não é único
- Documentos/CNH/telefone são normalizados (só dígitos / E.164) e validados
- `password` / secrets são rejeitados
- Outro usuário → `403`; sem contexto → `401`; não encontrado → `404`
- `DELETE` remove veículos/manutenções relacionados por CASCADE

## Vehicles

CRUD de veículos do usuário autenticado (ownership obrigatório). Relação `User 1:N Vehicle`.

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/vehicles` | Cria veículo |
| `GET` | `/v1/vehicles` | Lista só os veículos do usuário atual |
| `GET` | `/v1/vehicles/:id` | Busca por id (somente se for dono) |
| `PATCH` | `/v1/vehicles/:id` | Atualiza (não altera `userId`) |
| `DELETE` | `/v1/vehicles/:id` | Remove (cascade em manutenções) |

Campos do contrato de criação:

```json
{
  "brand": "Toyota",
  "model": "Corolla",
  "version": "XEi 2.0",
  "year": 2022,
  "licensePlate": "ABC1D23",
  "color": "Prata",
  "fuelType": "flex",
  "odometerKm": 45000
}
```

`brand`, `model` e `year` são obrigatórios. `year` aceita inteiros de `1900` até `anoAtual + 1`. `odometerKm`, quando enviado, não pode ser negativo. O client **não** pode enviar `id`, `userId`, `createdAt` ou `updatedAt`.

### Adapter local de `userId` (somente desenvolvimento)

Enquanto o vínculo final Auth→User de produção não está fechado neste módulo, o ownership usa o header:

```http
X-User-Id: <id-de-um-User-existente>
```

- Habilitado por padrão quando `NODE_ENV !== production`
- **Sempre desabilitado em production**
- Pode forçar off com `LOCAL_USER_ID_HEADER_ENABLED=false`

```bash
# 1) criar usuário
USER_ID=$(curl -s -X POST http://localhost:3333/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"driver@example.com","name":"Driver"}' | jq -r .id)

# 2) criar veículo
curl -X POST http://localhost:3333/v1/vehicles \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{"brand":"Toyota","model":"Corolla","year":2022,"licensePlate":"ABC1D23"}'

# 3) listar
curl http://localhost:3333/v1/vehicles -H "X-User-Id: $USER_ID"
```

Acesso a veículo de outro usuário → `404 Vehicle not found` (sem vazar existência).

## Maintenance

Histórico de manutenções por veículo (`Vehicle 1:N Maintenance`). O acesso deriva do dono do veículo (mesmo adapter `X-User-Id`).

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/v1/vehicles/:vehicleId/maintenances` | Cria manutenção |
| `GET` | `/v1/vehicles/:vehicleId/maintenances` | Lista histórico (mais recente → mais antiga) |
| `GET` | `/v1/maintenances/:id` | Busca por id |
| `PATCH` | `/v1/maintenances/:id` | Atualiza (não altera `vehicleId`) |
| `DELETE` | `/v1/maintenances/:id` | Remove |

Contrato de criação:

```json
{
  "type": "Troca de óleo",
  "description": "Troca de óleo e filtro",
  "serviceDate": "2026-10-03T00:00:00.000Z",
  "odometerKm": 45000,
  "costCents": 18990,
  "workshopName": "Oficina AutoTrack",
  "notes": "Próxima troca em 10.000 km"
}
```

- `type` e `serviceDate` são obrigatórios
- `type` aceita: `Preventiva`, `Corretiva`, `Revisão`, `Troca de óleo`, `Pneus`, `Freios`, `Elétrica`, `Outro`
- `costCents` é inteiro em centavos (`>= 0`) para evitar float
- `odometerKm`, quando enviado, não pode ser negativo
- O client **não** envia `id`, `vehicleId`, `createdAt` ou `updatedAt` (`vehicleId` vem da rota)

Filtros na listagem:

| Query | Descrição |
|---|---|
| `type` | Tipo de manutenção |
| `startDate` / `endDate` | Período em `serviceDate` (ISO-8601) |
| `odometerMin` / `odometerMax` | Faixa de quilometragem |

```bash
curl -X POST "http://localhost:3333/v1/vehicles/$VEHICLE_ID/maintenances" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: $USER_ID" \
  -d '{"type":"Troca de óleo","serviceDate":"2026-10-03T00:00:00.000Z","costCents":18990}'

curl "http://localhost:3333/v1/vehicles/$VEHICLE_ID/maintenances?type=Troca%20de%20%C3%B3leo&startDate=2026-01-01T00:00:00.000Z" \
  -H "X-User-Id: $USER_ID"
```

Veículo/manutenção inexistente ou de outro usuário → `404`.

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
> No Compose, a API usa `DATABASE_URL` apontando para o serviço `postgres`.

## Banco de dados (Prisma + PostgreSQL)

O Prisma usa **PostgreSQL** via `DATABASE_URL` (veja `.env.example`).

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

> Não use SQLite em ambientes online: o filesystem do Render é efêmero.

## Deploy no Render (demo)

Blueprint versionado em `render.yaml`.

### Configuração do Web Service

| Campo | Valor |
|---|---|
| Runtime | Node |
| Branch | `master` (ou branch de deploy aprovada) |
| Build Command | `npm ci && npm run build` |
| Start Command | `npm run start:render` |
| Health Check Path | `/v1/health` |

A API escuta em `0.0.0.0` e usa `process.env.PORT` (fornecido pelo Render).

### Variáveis de ambiente (somente no dashboard)

- `DATABASE_URL` — PostgreSQL gerenciado (Render Postgres, Neon ou Supabase). Preferir `?sslmode=require`
- `NODE_ENV=production`
- `SWAGGER_ENABLED=true` (demo/portfólio)
- `PGSSL=true` (opcional, se a URL não trouxer `sslmode`)
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — service account do Firebase (rotas protegidas)

Não versionar secrets. Após o primeiro deploy, valide:

```bash
curl https://<seu-servico>.onrender.com/v1/health
# Swagger: https://<seu-servico>.onrender.com/api/docs
```

> Plano free pode suspender o serviço por inatividade (cold start no primeiro request).

### URL pública

_Atualize este campo após o primeiro deploy bem-sucedido:_

- Demo: `https://autotrack-api-5r68.onrender.com`

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
npm run test:all
npm run build
```

## Testes (unitários + E2E)

Estratégia documentada em [`docs/testing.md`](docs/testing.md).

| Camada | Ferramenta | Escopo |
|---|---|---|
| Unitários | Jest (`*.spec.ts` em `src/`) | Services, guards, validators — Prisma/Firebase mockados |
| E2E | Jest + Supertest (`test/*.e2e-spec.ts`) | HTTP real, pipes, guards, DB isolado |

Após a migração para PostgreSQL, o E2E usa um **banco dedicado** `autotrack_e2e` (não o DB de desenvolvimento). Configure com `E2E_DATABASE_URL` se necessário.

```bash
# Postgres local (Compose) precisa estar up
docker compose up -d postgres

# unitários
npm run test
npm run test:watch
npm run test:cov

# e2e (cria/migra autotrack_e2e automaticamente)
npm run test:e2e

# tudo em sequência
npm run test:all
```

Estrutura:

```text
src/**/*.spec.ts          # unitários
test/
├── helpers/              # create-test-app, database, auth mock, global-setup
├── fixtures/             # users, vehicles, maintenances
├── *.e2e-spec.ts
└── jest-e2e.json
```

Firebase **nunca** é chamado de verdade nos testes — o verifier é mockado via `FIREBASE_TOKEN_VERIFIER`.

## Scripts úteis

```bash
npm run start:dev       # sobe a API em modo watch
npm run build           # compila para dist/
npm run start:prod      # sobe build local
npm run start:render    # migrate deploy + start (Render)
npm run lint            # analisa o código com Oxlint
npm run typecheck       # verifica tipagem TypeScript
npm run format          # formata com Prettier
npm run test            # testes unitários
npm run test:e2e        # testes end-to-end (DB isolado)
npm run test:cov        # cobertura unitária
npm run test:all        # unit + e2e
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
├── users/                  # POST/GET /v1/users
├── app.module.ts
├── prisma/
└── generated/prisma/
prisma/
├── schema.prisma
└── migrations/
docker-compose.yml
render.yaml                 # blueprint Render
```

À medida que o domínio evoluir, os módulos de negócio (ex.: veículos, manutenções, autenticação) devem ficar isolados em pastas próprias sob `src/`, seguindo o padrão de módulos do NestJS.

## Commits

Este repositório usa [Conventional Commits](https://www.conventionalcommits.org/) via Commitizen:

```bash
npm run commit
```

## Licença

Projeto privado / não licenciado (`UNLICENSED`).
