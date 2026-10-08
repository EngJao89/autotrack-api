# Auth and user lifecycle decisions (ATP-29)

## Authentication model

**Decision: external provider only (Firebase Authentication).**

- Login, registration, password recovery and tokens stay in the Auth/Firebase layer.
- The User module stores the local profile linked to that identity (today via email / local `X-User-Id` adapter).
- User DTOs and endpoints **never** accept `password`, `passwordHash`, `token` or other secrets.

Future evolution may add `authProvider` / `authSubject` (or `providerUserId`) without changing the profile contract.

## Profile uniqueness

| Field | Unique | Notes |
|---|---|---|
| `email` | yes | Already unique |
| `document` | yes (nullable unique) | CPF/CNPJ identity |
| `cnh` | yes (nullable unique) | Driver license |
| `phone` | no | Same phone may appear in different accounts |

Values are normalized **before** uniqueness checks and persistence (digits only for documents/CNH; E.164-like for phone).

## CNH policy (MVP)

`cnh` is **optional**. It is not required to create or update a profile.

## PUT semantics

`PUT /v1/users/:id` performs a **full replacement of mutable profile fields**:

- Mutable fields: `name`, `cnh`, `document`, `documentType`, `phone`
- Omitted fields are set to `null`
- `email`, `id`, `createdAt`, `updatedAt` are never accepted in the body

`PATCH /v1/users/:id` updates **only** the fields present in the payload. Explicit `null` clears a field.

## DELETE policy

`DELETE /v1/users/:id` performs a **physical delete**.

- Related `Vehicle` rows (and their `Maintenance` rows) are removed by Prisma/Postgres `ON DELETE CASCADE`
- This is intentional and documented; silent orphan retention is not allowed
- Soft-delete / anonymization (`deletedAt`) is deferred to a future LGPD hardening task

## Authorization

- `PUT`, `PATCH` and `DELETE` require the local user context (`X-User-Id` outside production)
- The path `:id` **must** match the authenticated/local actor; otherwise the API returns `403 FORBIDDEN`
- A user cannot modify or delete another user's profile
