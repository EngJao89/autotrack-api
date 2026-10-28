# Contratos REST `/v1` e estratégia de dados

- **Task:** [ATP-2](https://app.notion.com/p/Definir-contratos-de-API-e-estrat-gia-de-dados-3ece535b5fd6814bbc33d85cf4ca014d)  
- **Status:** Baseline revisada (arquitetura / especificação; estimativa M)  
- **Escopo:** Transversal — canônico em `autotrack-api`; Mobile só referencia  
- **Data:** 2026-10-27  

Consolida o **contrato de transporte** (REST `/v1` + OpenAPI + DTOs) e a **estratégia de persistência** (Prisma/PostgreSQL) para Auth, Users, Vehicles e Maintenance.

Esta entrega **não** reimplementa CRUDs, não migra o banco e não integra todas as telas Mobile. Fechar ATP-2 **não** é MVP completo nem integração ponta a ponta.

| Relacionado | Papel |
| --- | --- |
| [api-mobile-boundary.md](./api-mobile-boundary.md) (ATP-13) | Quem faz o quê / fluxos |
| [openapi-client-plan.md](./openapi-client-plan.md) (ATP-12) | Geração TypeScript (não reescolhida aqui) |
| ADR 0001 / 0002 / 0003 | Identidade, persistência, fronteira |
| Mobile ATP-3 / state-management | Estado/cache no cliente |

---

## 1. Fonte de verdade

| Camada | Artefato | Papel |
| --- | --- | --- |
| Persistência | `prisma/schema.prisma` + migrations | Modelo relacional, constraints, cascades |
| Transporte | DTOs + controllers Nest (`class-validator` / Swagger) | Contrato HTTP aprovado |
| Documento publicado | `GET /api/docs-json` (UI `/api/docs`) | OpenAPI 3 gerado — deve refletir DTOs |
| Consumidor | Mobile `apiRequest` + tipos manuais | Ainda **sem** client gerado (ATP-12) |

**Procedimento de mudança (mesmo ciclo):**

1. Alterar DTO / service / schema (e migration se necessário).  
2. Atualizar testes unitários/E2E afetados.  
3. Verificar OpenAPI (`/api/docs-json`).  
4. Atualizar este doc / CHANGELOG se a mudança for de contrato.  
5. Ajustar consumidores Mobile (e regenerar tipos quando o pipeline ATP-12 existir).

Prisma **não** é DTO público. Divergências DTO ↔ schema ↔ OpenAPI devem ser registradas (seção 8), não “corrigidas” editando JSON gerado à mão.

---

## 2. Modelo relacional (estado atual)

```text
User 1──N Vehicle 1──N Maintenance
```

| Modelo | PK | Uniques | Índices | Cascade |
| --- | --- | --- | --- | --- |
| `User` | `cuid` `id` | `email`, `firebaseUid?`, `cnh?`, `document?` | — | — |
| `Vehicle` | `cuid` `id` | — (`licensePlate` **não** unique) | `userId` | `onDelete: Cascade` do User |
| `Maintenance` | `cuid` `id` | — | `vehicleId` | `onDelete: Cascade` do Vehicle |

- **PostgreSQL + Prisma** é o estado atual (ADR 0002). Não propor SQLite.  
- `phone` e `licensePlate` **não** têm unicidade no schema — só se houver decisão futura explícita.  
- IDs públicos são `cuid` strings (não numéricos).  
- Escrita de domínio usa o `User.id` local resolvido pelo guard; **nunca** `userId` no body como autorização.

### Bootstrap e concorrência

- `POST /v1/auth/bootstrap` cria/sincroniza perfil a partir do token (`UsersService.bootstrapFromFirebase`).  
- Conflitos de unique (`email`, `firebaseUid`, `document`, `cnh`) → **409** `CONFLICT`.  
- Isso **não** torna todo POST idempotente; só o bootstrap está desenhado para “mesma identidade → mesmo perfil”.  
- Operações multi-write hoje são majoritariamente single-row; falha parcial entre User delete e Firebase Auth **não** é transação distribuída (exclusão Firebase fica fora do DELETE local).

### Dados por ambiente

- Dev / E2E / demo usam bancos ou schemas isolados (`E2E_DATABASE_URL`, Compose local).  
- Evidências e exemplos neste doc usam dados **sintéticos** apenas.  
- Retenção/LGPD: soft-delete e anonimização permanecem no backlog de ADRs; DELETE de User é **físico** + CASCADE.

---

## 3. Convenções de representação

| Tema | Regra revisada |
| --- | --- |
| Campo ausente vs `null` vs `""` | Ausente em **PATCH** = não altera; `null` em PATCH/PUT perfil = limpa (quando o campo é nullable); string vazia em geral rejeitada por `MinLength` / transforms |
| **PUT** (`PutUserDto`) | Substituição dos mutáveis do perfil; omitidos viram `null` na persistência; `email` / `id` / timestamps **nunca** no body |
| **PATCH** | Parcial (`PartialType`); só campos enviados mudam |
| Vehicles / Maintenance | Só **PATCH** (não há PUT); partial do create DTO |
| Firebase `uid` vs `User.id` | Distintos; vínculo só via token verificado |
| Strings | Trim na borda; e-mail lowercase; placa uppercase; `document`/`cnh` dígitos; telefone E.164 |
| Enums | `documentType`: `CPF` \| `CNPJ`; `Maintenance.type`: lista em `maintenance.constants.ts` |
| Datas | ISO-8601 strings no fio (`serviceDate`); `createdAt`/`updatedAt` DateTime ISO nas responses; tratar `serviceDate` como instante armazenado (UI pode mostrar data civil) |
| `costCents` | Inteiro ≥ 0; unidade **centavos BRL** (ex.: `18990` = R$ 189,90); conversão só na UI |
| `odometerKm` | Inteiro ≥ 0 quando presente; **sem** regra de monotonicidade obrigatória |
| Listagens | Vehicles: `orderBy createdAt desc`; Maintenances: `serviceDate desc` + filtros query; **sem paginação** no contrato atual (decisão explícita: não alegar page/limit) |
| 204 | DELETE users / vehicles / maintenances → corpo vazio |

---

## 4. Autenticação, adapters e erros

### Auth no fio

| Mecanismo | Uso |
| --- | --- |
| `Authorization: Bearer <firebase-id-token>` | Produção / app Expo |
| `AuthGuard` | Só valida token (`/auth/*`, `/users/me`) |
| `UserContextGuard` | Token → `firebaseUid` → `User.id`; fallback `X-User-Id` **somente** se `NODE_ENV !== production` (e flag não `false`) |

### Envelope de erro

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "…",
  "errors": [{ "field": "email", "messages": ["…"] }],
  "requestId": "…"
}
```

| Código | Uso típico |
| --- | --- |
| `VALIDATION_ERROR` | 400 whitelist / class-validator |
| `AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` | 401 Auth |
| `UNAUTHORIZED` | 401 genérico (ex. guard sem token) |
| `FORBIDDEN` | 403 — ex. PUT/PATCH/DELETE de **outro** user (`assertSelf`) |
| `NOT_FOUND` | 404 — recurso inexistente **ou** não pertencente (vehicles/maintenances ocultam existência) |
| `CONFLICT` | 409 unique / e-mail já ligado a outro Firebase |
| `INTERNAL_ERROR` | 500 sem stack/SQL |

**403 vs 404:** perfil “outro usuário” em mutação → **403**; veículo/manutenção de outro dono → **404** (política de ocultação). Não uniformizar sem revisar o contexto.

Não logar tokens, Admin keys ou PII desnecessário.

---

## 5. Matriz de contratos (por operação)

Legenda ambiente: **P** = produção app · **L** = local/dev adapter · **O** = operacional (health)

### 5.1 Auth

| Op | Auth | Body | Sucesso | Erros | Notas |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/auth/me` | Bearer | — | 200 `AuthUserResponseDto` (`firebaseUid`, `email`, `emailVerified`, `localUserId?`) | 401 Auth | Não cria perfil |
| `POST /v1/auth/bootstrap` | Bearer | `{}` (sem `firebaseUid` no body) | 200 `BootstrapResponseDto` `{ created, user }` | 401; 409 conflito | Preferido pelo Mobile |

### 5.2 Users

| Op | Auth | Sucesso | Erros | Ambiente |
| --- | --- | --- | --- | --- |
| `POST /v1/users` | **Nenhuma** | 201 `UserResponseDto` | 409 e-mail | **L** — bootstrap local; app Expo deve usar `/auth/bootstrap` |
| `GET /v1/users/me` | Bearer (`AuthGuard`) | 200 user | 401; 404 sem bootstrap | **P** |
| `GET /v1/users/:id` | **Nenhuma** | 200 user | 404 | **Lacuna** se edge público — endurecer antes de expor |
| `PUT /v1/users/:id` | `UserContextGuard` + self | 200 user | 401; 403; 404; 409 | **P** (ou X-User-Id em L) |
| `PATCH /v1/users/:id` | idem | 200 user | idem | **P** |
| `DELETE /v1/users/:id` | idem | **204** | 401; 403; 404 | CASCADE vehicles/maintenances; **não** apaga Firebase Auth |

### 5.3 Vehicles (`UserContextGuard` em todas)

| Op | Path/Query | Body | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| `POST /v1/vehicles` | — | `CreateVehicleDto` (sem `userId`) | 201 | 401; 400 |
| `GET /v1/vehicles` | — | — | 200 array (só do ator) | 401 |
| `GET /v1/vehicles/:id` | id | — | 200 | 401; 404 |
| `PATCH /v1/vehicles/:id` | id | `UpdateVehicleDto` | 200 | 401; 400; 404 |
| `DELETE /v1/vehicles/:id` | id | — | **204** | 401; 404 |

Campos create: `brand`, `model`, `year` obrigatórios; `version`, `licensePlate`, `color`, `fuelType`, `odometerKm` opcionais. Ano com min/max de domínio (`vehicles.constants`).

### 5.4 Maintenance

| Op | Auth | Notas |
| --- | --- | --- |
| `POST /v1/vehicles/:vehicleId/maintenances` | UserContext | 201; vehicle deve ser do ator → senão 404 |
| `GET /v1/vehicles/:vehicleId/maintenances` | UserContext | Query: `type`, `startDate`, `endDate`, `odometerMin`, `odometerMax`; ordem `serviceDate desc` |
| `GET /v1/maintenances/:id` | UserContext | 200 / 404 |
| `PATCH /v1/maintenances/:id` | UserContext | partial; sem mudar `vehicleId` via payload público |
| `DELETE /v1/maintenances/:id` | UserContext | **204** |

`type` ∈ `Preventiva | Corretiva | Revisão | Troca de óleo | Pneus | Freios | Elétrica | Outro`.

### 5.5 Health / raiz

| Op | Auth | Sucesso |
| --- | --- | --- |
| `GET /v1/health` | Não | 200 Terminus / 503 se DB down — **operacional**, não domínio |
| `GET /v1` | Não | string hello — não usar como contrato de produto |

---

## 6. Exemplos sintéticos

### Sucesso — bootstrap

```http
POST /v1/auth/bootstrap
Authorization: Bearer <firebase-id-token>
Content-Type: application/json

{}
```

```json
{
  "created": true,
  "user": {
    "id": "clxexample0001",
    "email": "driver@example.com",
    "name": "Driver",
    "firebaseUid": "firebase-uid-example",
    "cnh": null,
    "document": null,
    "documentType": null,
    "phone": null,
    "createdAt": "2026-10-27T12:00:00.000Z",
    "updatedAt": "2026-10-27T12:00:00.000Z"
  }
}
```

### Sucesso — criar manutenção

```json
{
  "type": "Troca de óleo",
  "description": "Óleo e filtro",
  "serviceDate": "2026-10-03T00:00:00.000Z",
  "odometerKm": 45000,
  "costCents": 18990,
  "workshopName": "Oficina Exemplo"
}
```

### Falha — validação

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": [
    { "field": "year", "messages": ["year must not be less than …"] }
  ],
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

### Falha — conflito

```json
{
  "statusCode": 409,
  "code": "CONFLICT",
  "message": "Email already in use",
  "requestId": "00000000-0000-4000-8000-000000000002"
}
```

---

## 7. Validação da baseline (artefatos confrontados)

Inspeção **documental** (não E2E ponta a ponta nesta task):

| Fluxo | DTOs / controllers | Prisma | Testes |
| --- | --- | --- | --- |
| Bootstrap / perfil | `auth.controller.ts`, `users.service.ts` (`bootstrapFromFirebase`, `assertSelf`) | `User` uniques | `auth.service.spec.ts`, users specs/E2E |
| Criar veículo | `CreateVehicleDto`, `vehicles.controller.ts` / `service` | `Vehicle.userId` + index | `vehicles.service.spec.ts` |
| Manutenção create/list | `CreateMaintenanceDto`, `ListMaintenancesQueryDto`, `maintenances.service.ts` | `Maintenance.vehicleId` | `maintenances.service.spec.ts` |
| OpenAPI | `src/config/swagger.ts` → `/api/docs-json` | — | Validação exploratória ATP-12 (OpenAPI 3.0.0) |

---

## 8. Divergências e lacunas

| Item | Impacto | Prioridade | Responsável | Próximo passo |
| --- | --- | --- | --- | --- |
| `GET /v1/users/:id` sem auth | Leitura de perfil por id | **Alta** (segurança) | API | Exigir Bearer + self (ou remover do edge público) |
| `POST /v1/users` sem auth | Criação anônima de user | **Alta** se demo pública | API | Restringir a non-prod / remover |
| Mobile sem CRUD vehicles/maintenance | Contrato API sem consumidor | Média (produto) | Mobile | Features incrementais (ATP-13) |
| Sem paginação | Listas crescem sem limite | Baixa (MVP) | API | Decidir limit default quando necessário |
| `operationId` só auto Nest | Fragilidade codegen | Média (ATP-12) | API | `operationId` explícitos |
| OpenAPI client não gerado | Drift de tipos Mobile | Média | Ambos | Seguir ATP-12 |
| DELETE User ≠ delete Firebase | Conta IdP órfã | Baixa (MVP) | Ops / futuro | Fluxo explícito de encerramento |
| `EXPO_PUBLIC_API_MOCK` default true | Mascara falha de API | Média | Mobile | Default false em builds de integração |

---

## 9. Evolução e compatibilidade

**Compatíveis (permanecem em `/v1`):** campos opcionais novos; novos enums aditivos; novos endpoints; documentação/erros mais precisos.

**Breaking (exigem plano de migração dos consumidores; `/v2` só se necessário):** remover/renomear campos; apertar obrigatoriedade; mudar semântica PUT/PATCH; mudar unidades (`costCents`); alterar política 403/404 de forma incompatível com clientes.

Após mudança de contrato: atualizar OpenAPI → (futuro) regenerar tipos Mobile (ATP-12) → ajustar call sites → testes. **Não** publicar pacote npm nem CI de codegen nesta task.

---

## 10. Critérios de aceite (ATP-2) — cobertura

| Critério | Onde |
| --- | --- |
| Inventário com referências | §§2–5, 7 |
| Matriz auth/payloads/erros | §5 |
| Opcionais / null / PUT-PATCH | §3 |
| IDs, datas, moeda, km | §§2–3 |
| Listagens / sem paginação falsa | §3, §5.3–5.4 |
| Relações, constraints, exclusões | §2 |
| Bootstrap / conflitos | §§2, 5.1, 6 |
| Ownership e adapters | §4, §8 |
| Envelope 403/404 | §4 |
| Evolução | §9 |
| Confrontação artefatos | §7 |
| Lacunas vs verificado | §8 |
| Links README/Mobile/ADRs | PRs desta task |
| Sem segredos/PII reais | exemplos §6 |
| Não alegar MVP/integração completa | cabeçalho |

---

## Referências de código

- `prisma/schema.prisma`  
- `src/config/swagger.ts`, `src/main.ts`  
- `src/auth/*`, `src/users/*`, `src/vehicles/*`, `src/maintenances/*`, `src/health/*`  
- `src/common/errors/error-codes.ts`, `src/common/user-context/user-context.guard.ts`  
- Mobile: `src/services/api/client.ts`, `src/features/auth/services/bootstrapProfile.ts`  

Branch sugerida: `docs/ATP-2-api-contracts-data-strategy`
