# ADR 0003 — Fronteira API/Mobile e contratos

- **Status:** Aceito
- **Data de registro:** 2026-10-14
- **Decisão original (se conhecida):** repositórios separados e REST `/v1` + OpenAPI desde o bootstrap da API; data exata desconhecida
- **Owners / revisores:** time AutoTrack
- **Escopo:** Transversal
- **Fonte:** `autotrack-api` (contrato HTTP e OpenAPI vivem aqui; `autotrack-mobile` consome e referencia este ADR)

## Contexto e problema

O AutoTrack é composto por um backend NestJS e um app Expo/React Native. É necessário delimitar responsabilidades, versão do contrato HTTP e como o mobile autentica e consome recursos sem misturar adapters de desenvolvimento com o fluxo de produção.

## Restrições relevantes

- Repositórios distintos: `autotrack-api` e `autotrack-mobile` (não monorepo nesta entrega).
- Prefixo público versionado **`/v1`**; breaking changes planejadas em `/v2`.
- OpenAPI/Swagger publicado pela API (`/api/docs`).
- Auth: Firebase no client; API só valida Bearer (ver [ADR 0001](0001-firebase-identity-and-local-profile.md)).
- Cliente TypeScript gerado a partir do OpenAPI **ainda não é decisão aceita** — plano de adoção em [`../openapi-client-plan.md`](../openapi-client-plan.md) (ATP-12); ADR formal na implementação.
- Estado/navegação do mobile são decisões do repositório mobile (backlog).

## Alternativas consideradas

| Alternativa | Por que não (ou limitação) |
|---|---|
| Monorepo único API+Mobile | Fora do escopo ATP-4; aumentaria acoplamento de release sem necessidade atual. |
| GraphQL | Não há registro de adoção; a API expõe REST versionado. |
| Cliente OpenAPI gerado já obrigatório | Intenção futura; **não** assumir que existe gerador/cliente versionado no mobile. |
| Contratos só implícitos no código do app | Fragiliza evolução; OpenAPI na API é a fonte do contrato HTTP. |

## Decisão

1. **Fronteira:** o mobile autentica no Firebase e consome a API via HTTP; a API não embute UI nem SDK mobile.
2. **Contrato:** REST sob **`/v1`**, documentado em OpenAPI (Swagger UI em `/api/docs` quando habilitado).
3. **Auth no fio:** `Authorization: Bearer <firebase-id-token>`; bootstrap de perfil em `POST /v1/auth/bootstrap`; perfil em `GET /v1/users/me`.
4. **Adapters de desenvolvimento** (`X-User-Id`, `POST /v1/users` sem Firebase) **não** são o contrato de produção do app Expo.
5. Decisões transversais de arquitetura são registradas **neste repositório** (`docs/adr/`) e referenciadas pelo mobile para evitar duplicação.

## Consequências

### Positivas

- Contratos versionáveis e inspecionáveis (Swagger).
- Responsabilidades claras: IdP + UI no mobile; validação, persistência e regras de negócio na API.
- ADRs transversais com uma fonte canônica (`autotrack-api`).

### Custos, riscos e limitações

- Duas bases de código e dois ciclos de PR para mudanças de contrato.
- Enquanto o cliente OpenAPI não existir, o mobile pode driftar do schema — mitigar com revisão de contrato e testes de contrato futuros.
- Fluxos ainda em evolução no mobile não devem ser documentados aqui como “aceitos”.
- Feature-first no mobile, state management e navegação ficam no backlog (não neste ADR).

## Plano de adoção / migração

Já adotado na API: prefixo `/v1`, Swagger, módulos Users/Vehicles/Maintenance, Auth Firebase.

Pendente (fora deste ADR / backlog):

- Integração completa Expo ↔ API em produção
- Geração de client TypeScript a partir do OpenAPI — ver [`../openapi-client-plan.md`](../openapi-client-plan.md) (ATP-12)
- Estratégia de state management e navegação no mobile

## Referências

- [Guia operacional da fronteira (ATP-13)](../api-mobile-boundary.md) — matriz, fluxos, lacunas e rastreabilidade
- README da API — seções Auth, Users, OpenAPI, Arquitetura
- `src/config/swagger.ts`, `src/main.ts` (prefixo `v1`)
- [Plano OpenAPI client (ATP-12)](../openapi-client-plan.md)
- [ADR 0001 — Identidade Firebase e perfil local](0001-firebase-identity-and-local-profile.md)
- Tasks: ATP-15 (Swagger), ATP-13 (fronteira), ATP-12 (plano client), ATP-21/30 (Auth), ATP-25/26/28 (domínio), ATP-4 (este processo)
- Repositório consumidor: `autotrack-mobile` (referência cruzada ao índice ADR desta API)
