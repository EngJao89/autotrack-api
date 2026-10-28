# Fronteira de integração API ↔ Mobile

- **Task:** ATP-13  
- **Status:** Documentado (arquitetura; estimativa P)  
- **Escopo:** Transversal — referência **canônica** neste repositório (`autotrack-api`)  
- **Consumidor:** [`autotrack-mobile`](https://github.com/EngJao89/autotrack-mobile) (linkar; não duplicar o corpo)  
- **Data:** 2026-10-26  

Este documento aprova a **fronteira**, os **fluxos de referência** e o **plano de validação** entre `autotrack-mobile`, `autotrack-api` e Firebase Authentication.  

**Não** significa que todas as jornadas Mobile↔API estão implementadas ponta a ponta. Fechar ATP-13 **não** é “integração completa entregue”.

Decisão de princípio (ADR Aceito): [ADR 0003 — Fronteira API/Mobile e contratos](./adr/0003-api-mobile-boundary-and-contracts.md).  
Contratos e persistência (o que é transmitido/armazenado): [api-contracts-and-data-strategy.md](./api-contracts-and-data-strategy.md) (ATP-2).  
Plano de tipos/cliente OpenAPI (não reescolhido aqui): [openapi-client-plan.md](./openapi-client-plan.md) (ATP-12).

---

## 1. Matriz de responsabilidades

| Camada | Faz | Não faz |
| --- | --- | --- |
| **Mobile** | UI, navegação, acessibilidade, formulários e feedback; auth via SDK Firebase; obter ID Token **no momento da request**; consumir `/v1` e traduzir erros para UX; estado/cache (Zustand / ATP-3) com limpeza por sessão; validação de formulário só para UX | Validar token com Admin SDK; persistir domínio; armazenar senha; inventar ownership; embutir segredos Admin |
| **API** | Validar ID Token; mapear `firebaseUid` → `User.id` local; autorização por proprietário; regras de negócio; DTOs + `class-validator`; Prisma/PostgreSQL; OpenAPI; códigos de erro + `requestId` | Emitir senha do app; guardar refresh tokens Firebase; confiar em `userId`/`firebaseUid` no body como prova de identidade |
| **Firebase** | Credenciais e provedores (Google / e-mail+senha); sessão e emissão de ID Tokens; identidade externa (`uid`) | Perfil de negócio local; CRUD de veículos/manutenções |

Tooling Notion/Git (**não** faz parte desta fronteira em runtime): scripts locais; ver `docs/notion-task-workflow.md`.

---

## 2. Identidade: Firebase uid vs User.id local

| Conceito | Origem | Uso |
| --- | --- | --- |
| `firebaseUid` | Claim do ID Token (verificado na API) | Chave de vínculo IdP ↔ perfil local |
| `User.id` | UUID gerado pela API (Postgres) | Ownership de veículos/manutenções; paths `/v1/users/:id` |

Regras:

1. App autentica no Firebase → obtém ID Token → envia `Authorization: Bearer <token>`.
2. API **não** aceita `firebaseUid` no body como prova de identidade (bootstrap usa só o token).
3. Falha de bootstrap / API **não** deve ser confundida com falha de login Firebase (UX distinta).
4. Evidência API: `AuthGuard` + `UserContextGuard` (`src/auth/guards/auth.guard.ts`, `src/common/user-context/user-context.guard.ts`); bootstrap `POST /v1/auth/bootstrap` (`src/auth/auth.controller.ts`).
5. Evidência Mobile: `bootstrapUserProfile` + `apiRequest` com `idToken` (`src/features/auth/services/bootstrapProfile.ts`, `src/services/api/client.ts`).

---

## 3. Fluxos de referência

### 3.1 Entrada e bootstrap

```text
Firebase Auth (SDK) → ID Token
       ↓
POST /v1/auth/bootstrap  (Bearer)  → cria/sincroniza User local
       ↓ (se 404/405 de contrato antigo)
GET /v1/users/me         (Bearer)  → perfil local
       ↓
Zustand: profile ready (limpar no logout / troca de uid)
```

| Passo | Responsável | Evidência | Classificação |
| --- | --- | --- | --- |
| Login Google / e-mail | Mobile + Firebase | `AuthProvider`, `session.ts` | **Implementado verificado** (mobile) |
| Bearer + bootstrap | Mobile → API | `bootstrapProfile.ts`, `AuthController.bootstrap` | **Implementado verificado** |
| Fallback `/users/me` | Mobile → API | mesmo + `UsersController.me` | **Implementado verificado** |
| Mock se API falhar | Mobile | `EXPO_PUBLIC_API_MOCK` (default `true` em `env.ts`) | **Adapter local** — não é integração real |

### 3.2 Veículos e manutenções

| Regra | Estado |
| --- | --- |
| Payload conforme OpenAPI; `userId` **não** no body de create | **Documentado + API implementada** — `CreateVehicleDto` / maintenance DTOs sem `userId` |
| Usuário resolvido pelo guard (Bearer → `firebaseUid` → `User.id`) | **API implementada** — `@UseGuards(UserContextGuard)` em vehicles/maintenances |
| Ownership em toda operação (`findOwnedOrThrow` / vehicle do user) | **API implementada** — `vehicles.service.ts`, services de maintenance |
| `vehicleId` de rota identifica recurso, não prova propriedade sozinho | **API implementada** — checagem com `userId` do contexto |
| Telas/CRUD Mobile de veículos e manutenções | **Pendente** — mobile só tem PoC de sessão/auth; sem clients de domínio |

Swagger: rotas documentam header opcional `X-User-Id` (adapter local). Em produção o adapter está **desligado** (`UserContextGuard`).

### 3.3 Logout e troca de sessão

| Comportamento | Responsável | Evidência | Classificação |
| --- | --- | --- | --- |
| `signOut` Firebase | Mobile | `AuthProvider` | **Implementado verificado** |
| Limpar perfil / `selectedVehicleId` / status bootstrap | Mobile (Zustand) | `clearSessionClientState` | **Implementado verificado** |
| Ignorar respostas stale após troca de uid | Mobile | requestId / identityKey no store | **Implementado verificado** (PoC ATP-3) |
| Revogação imediata de todos os ID Tokens já emitidos | — | Firebase não garante; tokens expiram | **Documentado** — não presumir revogação instantânea |
| Invalidar sessão server-side além do JWT | API | Stateless Bearer | N/A (sem denylist) |

### 3.4 Ambientes e adapters

| Mecanismo | Onde | Produção? |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Mobile | Sim — URL por ambiente |
| `EXPO_PUBLIC_API_MOCK` | Mobile | **Não** como sucesso silencioso; default atual `true` em dev — risco se esquecer de desligar |
| `X-User-Id` | API `UserContextGuard` | **Não** — off quando `NODE_ENV=production` |
| `POST /v1/users` (create sem Bearer) | API `UsersController.create` | **Não** — bootstrap local/dev; app Expo deve usar `/auth/bootstrap` |
| `GET /v1/users/:id` sem guard | API | **Lacuna** — leitura por id sem auth; restringir antes de exposição pública ampla |
| Firebase Admin / `DATABASE_URL` | Só API / CI | Nunca no bundle Mobile |

---

## 4. Contratos e representação de dados

| Tema | Diretriz |
| --- | --- |
| Fonte de transporte | OpenAPI da API (`/api/docs`, `/api/docs-json`) |
| Geração TS | Seguir ATP-12 (`openapi-typescript` + `apiRequest`); **não** reescolher gerador nesta task; cliente **ainda não** implementado |
| UI models | Mapeadores explícitos nas features (ATP-7); não vazar entidades Prisma |
| PUT vs PATCH | PUT = substituição dos mutáveis; PATCH = parcial (`null` limpa onde documentado) — ver DTOs Users |
| Datas | ISO-8601 no fio (`serviceDate`); apresentação local na UI; não inventar timezone além do contrato |
| Dinheiro | `costCents` inteiro no transporte; conversão só na UI/entrada |
| Listagens | Sem paginação no contrato atual — não inventar |
| 204 / sem corpo | DELETE vehicles/maintenances/users conforme OpenAPI |

---

## 5. Erros e resiliência

| Status (exemplos) | Código típico (API) | UX Mobile |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Mensagens de campo; não reenviar cego |
| 401 | `AUTH_TOKEN_*` | Reautenticar / renovar ID Token; **sem loop infinito** |
| 403 | ownership / forbidden | Mensagem clara; não “mockar sucesso” |
| 404 | `NOT_FOUND` | Recurso inexistente ou não pertencente (API unifica em 404 em vários casos) |
| 409 | `CONFLICT` | Conflito de unicidade (ex. e-mail) |
| 500 | `INTERNAL_ERROR` | Genérico; correlacionar com `requestId` |

Shape API: `{ statusCode, code, message, errors?, requestId }` — ver `docs` / `HttpErrorResponseDto`.  
Mobile: `ApiError` com `status` + `body` (`client.ts`).  

Políticas:

- Distinguir HTTP vs timeout/rede (`status === 0`) vs parse inválido.
- Não retry automático de mutations sem idempotência.
- Não converter falha de API em sucesso via mock/cache **sem** sinalização (badge Mock).
- Nunca logar/exibir token, private key ou PII desnecessário.

Estado/cache: alinhar a ATP-3 / [mobile `docs/state-management.md`](https://github.com/EngJao89/autotrack-mobile/blob/master/docs/state-management.md) — perfil em Zustand **não** é cache HTTP completo.

---

## 6. Matriz de rastreabilidade (jornadas)

Legenda: **D** = documentado · **IV** = implementado verificado · **P** = pendente · **A** = adapter local

| Jornada | Endpoint(s) | Mobile | API | Firebase | Contrato | Auth | UI / estado | Falhas | Evidência | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | — | SDK | — | IdP | — | Session | AuthProvider | credencial inválida | `session.ts`, providers docs | **IV** |
| Bootstrap perfil | `POST /v1/auth/bootstrap` | `bootstrapProfile` | `AuthController` | token | OpenAPI Auth | Bearer | Zustand ready | 401/5xx → mock se flag | código citado | **IV** (+ **A** mock) |
| Perfil me | `GET /v1/users/me` | fallback bootstrap | `UsersController.me` | token | OpenAPI | Bearer | store | 404 sem bootstrap | código | **IV** |
| Update perfil | `PUT/PATCH /v1/users/:id` | — | `UserContextGuard` + self-only | token ou X-User-Id | OpenAPI | Bearer | — | 403/404 | API only | **API IV** / **Mobile P** |
| Listar/criar veículos | `/v1/vehicles` | — | `UserContextGuard` + ownership | — | OpenAPI | Bearer | — | 401/404 | API services | **API IV** / **Mobile P** |
| Manutenções | `/v1/vehicles/:vehicleId/maintenances`, `/v1/maintenances/:id` | — | ownership via vehicle | — | OpenAPI | Bearer | — | 401/404 | API | **API IV** / **Mobile P** |
| Logout | — | signOut + clear store | — | signOut | — | — | limpeza | stale response | `AuthProvider` | **IV** |
| Create user local | `POST /v1/users` | não usar em prod | sem guard | — | OpenAPI (dev) | nenhuma | — | 409 e-mail | controller | **A** / lacuna se público |
| Get user by id | `GET /v1/users/:id` | — | **sem guard** | — | OpenAPI | nenhuma | — | 404 | controller | **Lacuna (P)** |

---

## 7. Lacunas e plano incremental de validação

### Lacunas explícitas (inspecionadas)

1. Mobile **não** consome ainda Vehicles/Maintenance/perfil mutável — só auth + bootstrap.
2. `GET /v1/users/:id` e `POST /v1/users` sem autenticação — ok como adapters de bootstrap local **se** não forem expostos publicamente sem proteção adicional.
3. `EXPO_PUBLIC_API_MOCK` default `true` — fácil mascarar falha de API em demos.
4. Cliente OpenAPI tipado **não** existe (só plano ATP-12).
5. Integração “produção” Expo ↔ API (URL estável, mock off, rotas sensíveis hardenizadas) **pendente**.
6. Exclusão de conta distribuída (Firebase + API) — só identificar: API faz DELETE físico do `User` (CASCADE); limpeza no Firebase Auth é responsabilidade operacional/Mobile futura — **não** implementada como fluxo único.

### Etapas futuras (sem criar cards automaticamente)

1. Desligar mock por default em builds de integração; exigir `EXPO_PUBLIC_API_URL`.
2. Hardening: proteger ou remover do edge público `POST /v1/users` e `GET /v1/users/:id` (ou exigir auth/admin).
3. Feature Mobile: listagem/CRUD veículos com Bearer + ownership real (E2E).
4. Feature Mobile: manutenções + tratamento `costCents` / datas.
5. Codegen OpenAPI (ATP-12 follow-up) na feature piloto bootstrap/`users/me`.
6. Testes de contrato / E2E integrados (API já tem E2E isolado; mobile ainda não fecha o loop).

---

## 8. Relação com outros artefatos

| Artefato | Papel vs este doc |
| --- | --- |
| [ADR 0003](./adr/0003-api-mobile-boundary-and-contracts.md) | Decisão aceita (princípio); este guia operacionaliza fluxos e rastreabilidade |
| [ADR 0001](./adr/0001-firebase-identity-and-local-profile.md) | Identidade Firebase ↔ perfil local |
| [openapi-client-plan.md](./openapi-client-plan.md) | Geração TS (ATP-12) |
| Mobile ADR 0003 / architecture / state-management / auth | Espelho e detalhes de UX/estado — apontar para **este** arquivo como fronteira canônica |

---

## 9. Evidências de código (amostra)

| Área | Path |
| --- | --- |
| Swagger / `/v1` | `src/config/swagger.ts`, `src/main.ts` |
| Bearer verify | `src/auth/guards/auth.guard.ts` |
| Ownership context | `src/common/user-context/user-context.guard.ts` |
| Vehicles ownership | `src/vehicles/vehicles.service.ts` |
| Bootstrap | `src/auth/auth.controller.ts` |
| Mobile HTTP | `autotrack-mobile/src/services/api/client.ts` |
| Mobile bootstrap | `autotrack-mobile/src/features/auth/services/bootstrapProfile.ts` |
| Mobile session clear | `autotrack-mobile/src/features/auth/store/sessionStore.ts` |

---

## Referências

- README da API — Auth, Users, Vehicles, Maintenance, OpenAPI  
- `docs/auth-and-user-lifecycle.md`, `docs/firebase-providers.md`  
- Tasks: ATP-13 (este), ATP-3 (estado), ATP-7 (feature-first), ATP-12 (OpenAPI client plan), ATP-30/31 (Firebase)  
- Branch sugerida: `docs/ATP-13-api-mobile-boundary`
