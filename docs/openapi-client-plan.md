# Plano: geração de tipos/cliente TypeScript a partir do OpenAPI

- **Task:** [ATP-12](https://www.notion.so/3ece535b5fd6811aab06ca6f6da96e7f)
- **Status do plano:** Proposto (documentação; estimativa P)
- **Escopo:** Transversal (`autotrack-api` publica o contrato; `autotrack-mobile` consome)
- **Data:** 2026-10-26

Este documento define um plano **reproduzível** para gerar tipos e/ou cliente TypeScript a partir do OpenAPI da API e usá-los no mobile, reduzindo drift entre DTOs documentados e chamadas HTTP.  
**Não** é a implementação: não instala gerador no fluxo de produção, não migra features e não troca o transporte atual.

Decisão formal (ADR Aceito) fica para a task de implementação. Até lá, este plano e o backlog em [`docs/adr/README.md`](./adr/README.md) são a referência.

---

## 1. Como obter o documento OpenAPI

A UI Swagger (`/api/docs`) **não** é a fonte do gerador. O artefato utilizável é o JSON (ou YAML) do documento.

| Endpoint | Papel |
| --- | --- |
| `GET /api/docs` | UI humana (Swagger UI) |
| `GET /api/docs-json` | Documento OpenAPI em JSON — **usar no gerador** |
| `GET /api/docs-yaml` | Mesmo documento em YAML (disponível pelo Nest Swagger) |

Deriva do `SwaggerModule.setup('api/docs', …)` em [`src/config/swagger.ts`](../src/config/swagger.ts): o Nest expõe o JSON em `{path}-json` por padrão (`/api/docs-json`), **fora** do prefixo global `/v1`.

Habilitação: mesma regra de `isSwaggerEnabled()` (`SWAGGER_ENABLED` ou `NODE_ENV !== production`). Em ambientes sem Swagger, o JSON não está disponível via HTTP — daí o export estático (seção 2).

### Validação exploratória (2026-10-26)

Com a API local (`SWAGGER_ENABLED=true`):

| Checagem | Resultado |
| --- | --- |
| `GET /api/docs-json` | HTTP 200 |
| Versão OpenAPI | **3.0.0** |
| `info.version` | `v1` |
| Paths / operações | 11 paths, **20** operações |
| `components.securitySchemes.bearer` | Presente (HTTP Bearer) |
| `operationId` | Presente e **único** em todas as 20 operações |
| Formato dos IDs | Auto Nest: `{Controller}_{method}` (ex.: `AuthController_bootstrap`) |

Exemplos de `operationId` observados: `UsersController_me`, `VehiclesController_findAll`, `VehicleMaintenancesController_create`, `MaintenancesController_remove`.

**Lacuna:** nenhum `@ApiOperation({ operationId: '…' })` explícito no código. Os IDs atuais são estáveis **enquanto** nomes de controller/método não mudarem; rename quebra consumidores. Estabilizar com `operationId` explícitos é pré-requisito recomendado da implementação.

---

## 2. Fonte de verdade, exportação e versionamento

```text
DTOs + controllers Nest  →  SwaggerModule.createDocument  →  /api/docs-json
                                                         ↘  (futuro) openapi/v1.json versionado
```

| Papel | Onde |
| --- | --- |
| **Fonte de verdade** | Código da API (DTOs `class-validator` + decorators `@nestjs/swagger`) |
| **Contrato publicado** | Documento OpenAPI 3 gerado em runtime |
| **Artefato para CI/mobile (futuro)** | Export estático versionado na API, ex.: `openapi/v1.json` |

Política proposta (implementação futura):

1. Script na API gera `openapi/v1.json` a partir do mesmo `createDocument` (sem editar o JSON à mão).
2. Mobile (ou job de codegen) consome o arquivo pinado (path/URL de release), **não** a demo Render hardcoded.
3. Diff do export no PR da API torna breaking changes visíveis.
4. Lacunas de schema → corrigir na API; **nunca** patch manual do código gerado no mobile.

Não há hoje export versionado no repositório — só a UI/JSON em runtime. A presença de `/api/docs` **não** prova pipeline de client.

---

## 3. Alternativas: tipos vs cliente HTTP tipado

Critérios (ATP-12): simplicidade, Expo/React Native/TypeScript, dependências, erros `{ statusCode, code, message, … }`, Bearer dinâmico, reprodutibilidade, manutenção.  
**Não** introduzir segunda biblioteca de cache/estado (TanStack Query, orval-react-query, etc.) como efeito colateral — alinhado a ATP-7 e ADR mobile 0004.

| Abordagem | Ideia | Prós | Contras |
| --- | --- | --- | --- |
| **A — Tipos + transporte atual** | Gerar só types/paths; manter [`apiRequest`](https://github.com/EngJao89/autotrack-mobile/blob/master/src/services/api/client.ts) | Zero troca de HTTP stack; Auth/`ApiError` atuais; migração gradual | Tipagem manual nos call sites (`apiRequest<Paths[…]>`) |
| **B — Cliente HTTP tipado fino** | Gerar client com `fetch` configurável (base URL + headers) | Menos boilerplate por operação | Nova superfície de API; wrappers Auth ainda manuais |

### Ferramentas avaliadas (duas)

Versões exatas ficam para a task de implementação (`npm view` na época).

| Ferramenta | Encaixa em | Notas |
| --- | --- | --- |
| **`openapi-typescript`** | **A (recomendada)** | Gera `paths` / `components` TypeScript a partir do JSON; sem runtime obrigatório; funciona com fetch existente |
| **`openapi-fetch`** | **B** | Client tipado fino sobre fetch; mesmos autores/ecossistema; útil se no futuro quiser operações tipadas sem abandonar fetch |

Descartado **neste** plano como default: Orval/Hey API em modo React Query (puxaria cache remoto). Orval em modo “client only” poderia reavaliar-se depois; não é necessário para o MVP tipado.

---

## 4. Decisão recomendada

**Adotar abordagem A com `openapi-typescript`.**

1. Manter `apiRequest` + Firebase ID Token por request.
2. Gerar tipos em diretório isolado no mobile (seção 5).
3. Tipar respostas/bodies gradualmente nas features.
4. Considerar `openapi-fetch` só se a equipe quiser client gerado **sem** trocar o modelo de Auth/erros — não é pré-requisito.

Isso maximiza compatibilidade com o estado atual do mobile e cumpre o objetivo de reduzir divergência de contrato sem reescrever a camada HTTP.

---

## 5. Layout, comando e política de atualização (futuro)

### Localização (mobile)

```text
src/services/api/
├── client.ts              # apiRequest / ApiError (manual)
├── generated/             # SOMENTE saída do gerador — não editar
│   └── schema.ts          # ex.: openapi-typescript
└── (wrappers)             # Auth header, mapeamento de erro — fora de generated/
```

- Features consomem contratos públicos / wrappers; mapeamento transporte → UI nos limites ATP-7.
- Base URL: `EXPO_PUBLIC_API_URL` (já existente).
- Token: obtido no momento da request pelo Auth Firebase; **nunca** embutido no OpenAPI nem no artefato gerado.
- `X-User-Id` e `POST /v1/users` (bootstrap local) permanecem **adapters de desenvolvimento** — não viram auth do cliente distribuído ([ADR 0003](./adr/0003-api-mobile-boundary-and-contracts.md)).

### Comando (esboço; não instalado nesta task)

```bash
# Na API (export): gravar openapi/v1.json
# No mobile:
npx openapi-typescript <path-ou-url-do-v1.json> -o src/services/api/generated/schema.ts
```

Política: regenerar quando o export da API mudar; revisar diff do `generated/`; falhar CI se o gerado estiver desatualizado (opcional na 1ª entrega).

---

## 6. Checklist do contrato a verificar (antes/durante implementação)

Usar no export real; lacunas → issues na API.

- [x] Documento válido e versão OpenAPI identificada (**3.0.0**, validação exploratória)
- [x] `operationId` presente e único por operação (**hoje auto Nest**; preferir explícitos)
- [ ] Schemas request/response: obrigatoriedade, nulabilidade, enums, datas (`serviceDate`), monetário (`costCents`) — revisar sample do export na implementação
- [ ] Parâmetros de rota/filtros, 204/sem corpo, erros HTTP documentados (`ValidationErrorResponseDto`, `AuthErrorResponseDto`, `HttpErrorResponseDto`)
- [x] Bearer Auth documentado (`securitySchemes.bearer`)
- [ ] Rotas só-desenvolvimento diferenciadas no doc (ex.: `POST /v1/users` sem Firebase) — marcar description/tag ou `x-internal`
- [ ] Exemplos sem credenciais nem PII reais
- [ ] Lacunas registradas na API; gerado no mobile **não** editado à mão

---

## 7. Integração com o mobile (avaliação)

| Tópico | Diretriz |
| --- | --- |
| Transporte | Continuar `fetch` via `apiRequest` |
| Erros | Preservar `ApiError` + shape `{ statusCode, code, message, errors?, requestId }` |
| Auth | `Authorization: Bearer <idToken>` por chamada |
| Cache/estado | Fora deste plano (ADR mobile 0004 / TanStack depois) |
| Adoção | Feature a feature (auth/bootstrap → users/me → vehicles → maintenances) |

---

## 8. Riscos

| Risco | Mitigação |
| --- | --- |
| `operationId` implícito muda com rename | `operationId` estáveis nos `@ApiOperation` |
| Swagger off em produção | Export `openapi/v1.json` no repo/CI |
| Drift mobile vs API | Codegen + diff do export em PR |
| Editar gerado à mão | Diretório `generated/` + política no README |
| Puxar React Query “de brinde” | Ficar em `openapi-typescript` (+ opcional `openapi-fetch`) |
| Confundir UI `/api/docs` com artefato | Documentar `/api/docs-json` e export estático |

---

## 9. Etapas futuras (fora de ATP-12)

1. **API:** `operationId` explícitos; marcar rotas dev; script `openapi:export` → `openapi/v1.json`.
2. **Mobile:** dep `openapi-typescript`; script de generate; commit inicial de `generated/`.
3. **Tipar** uma feature piloto (`bootstrap` / `users/me`).
4. **ADR** transversal Aceito (ou Proposto → Aceito) apontando este plano + evidência de PR.
5. Opcional: job CI que falha se o export divergir do committed JSON.

---

## Referências

- [`src/config/swagger.ts`](../src/config/swagger.ts) — DocumentBuilder + setup `/api/docs`
- [ADR 0003 — Fronteira API/Mobile](./adr/0003-api-mobile-boundary-and-contracts.md)
- [Índice ADR / backlog](./adr/README.md)
- Mobile: `src/services/api/client.ts`, ADR 0003 / 0004, `docs/architecture.md` (ATP-7)
- README — seção OpenAPI
- Card ATP-12 (planejamento; implementação em tasks posteriores)
