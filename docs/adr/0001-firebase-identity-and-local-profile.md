# ADR 0001 — Identidade Firebase e perfil local

- **Status:** Aceito
- **Data de registro:** 2026-10-14
- **Decisão original (se conhecida):** progressiva — Auth Firebase (ATP-21) e vínculo `firebaseUid` (ATP-30); data exata da escolha inicial desconhecida
- **Owners / revisores:** time AutoTrack
- **Escopo:** Transversal
- **Fonte:** `autotrack-api` (este repositório é a fonte canônica; `autotrack-mobile` deve referenciar este ADR)

## Contexto e problema

O AutoTrack precisa autenticar usuários no app (Expo) e autorizar chamadas na API NestJS sem que o backend vire um provedor de senhas. Credenciais, recuperação de senha e emissão de tokens de sessão devem ficar fora do domínio de negócio (perfil, veículos, manutenções).

## Restrições relevantes

- A API não deve persistir senhas, hashes, ID tokens ou refresh tokens.
- Identidade estável para autorização não pode ser apenas o e-mail.
- Provedores MVP: Google e e-mail/senha no Firebase Authentication.
- LGPD / minimização: dados pessoais de perfil ficam no banco local com propósito documentado.
- Adapter local `X-User-Id` existe só para desenvolvimento e está desabilitado em production.

## Alternativas consideradas

| Alternativa | Por que não (ou limitação histórica) |
|---|---|
| JWT próprio emitido pela API + senha local | Fora do escopo das tasks de Auth; aumentaria superfície de credenciais na API. |
| Auth0 / outro IdP | Não há registro formal de avaliação comparativa na época; Firebase foi a escolha adotada no código e na documentação de provedores. |
| Usar só e-mail como chave de autorização | Rejeitado pelas regras de segurança ATP-30/31: colisões e troca de e-mail quebram ownership. |

> Limitação: alternativas IdP não foram catalogadas em ADR na época da implementação inicial (ATP-21). Este registro consolida o estado aceito com evidência de código.

## Decisão

1. **Firebase Authentication** é a fonte de identidade e credenciais (client-side no Expo).
2. A API valida apenas o **Firebase ID Token** (`Authorization: Bearer …`) via Firebase Admin SDK.
3. O vínculo com o perfil local é o campo único **`User.firebaseUid`**, nunca aceito em DTOs mutáveis.
4. **`POST /v1/auth/bootstrap`** cria ou sincroniza o perfil mínimo a partir das claims do token; **`GET /v1/users/me`** devolve o perfil já vinculado.
5. Políticas de e-mail (sync do provedor, colisão → 409, e-mail não verificado permitido no MVP) e ownership ficam nos guias de lifecycle — este ADR não as duplica.

## Consequências

### Positivas

- Separação clara: credenciais no Firebase; dados de negócio na API.
- Ownership e autorização baseados em identidade estável (`firebaseUid` → `User.id`).
- Mesmo contrato Bearer para Google e e-mail/senha.
- Testes isolados via mock do verifier (`FIREBASE_TOKEN_VERIFIER`), sem chamar Firebase real.

### Custos, riscos e limitações

- Dependência operacional do Firebase (disponibilidade, configuração de provedores e service account).
- Bootstrap exige claim de e-mail no token; colisões de e-mail com outro `firebaseUid` exigem intervenção (409).
- `email_verified` ainda não bloqueia bootstrap no MVP.
- Adapter `X-User-Id` pode mascarar bugs se usado em fluxos que deveriam ser Bearer — apenas dev.

## Plano de adoção / migração

Já adotado na API:

- Auth module + `AuthGuard` / `@CurrentUser()`
- `firebaseUid` + migration
- bootstrap / `/users/me` + `UserContextGuard` com preferência Bearer

No mobile: autenticar no Firebase, enviar Bearer e chamar bootstrap na primeira sessão (implementação no repositório `autotrack-mobile`).

## Referências

- Guias (não duplicar aqui): [`docs/auth-and-user-lifecycle.md`](../auth-and-user-lifecycle.md), [`docs/firebase-providers.md`](../firebase-providers.md)
- Código: `src/auth/`, `src/users/users.service.ts` (`bootstrapFromFirebase`), `prisma/schema.prisma` (`User.firebaseUid`)
- Tasks: ATP-21, ATP-29, ATP-30, ATP-31
- PR de vínculo: merge `feature/ATP-30-firebase-identity-link` em `master`
- ADR relacionado: [0003 — Fronteira API/Mobile e contratos](0003-api-mobile-boundary-and-contracts.md)
