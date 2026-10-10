# Auth and user lifecycle decisions (ATP-29 / ATP-30)

## Authentication model

**Decision: external provider only (Firebase Authentication).**

- Login, registration, password recovery and tokens stay in the Auth/Firebase layer.
- The User module stores the local profile linked by **`firebaseUid`** (stable external identity).
- User DTOs and endpoints **never** accept `password`, `passwordHash`, `token`, `firebaseUid` (writable) or other secrets.
- The API does **not** issue its own JWT login.

## Identity linkage (ATP-30)

| Field | Unique | Notes |
|---|---|---|
| `firebaseUid` | yes (nullable unique) | Primary link to Firebase; set only by bootstrap/sync |
| `email` | yes | Provider data; synced from Firebase when safe |
| `document` | yes (nullable unique) | CPF/CNPJ identity |
| `cnh` | yes (nullable unique) | Driver license |
| `phone` | no | Same phone may appear in different accounts |

### Bootstrap policy

`POST /v1/auth/bootstrap` (Bearer Firebase ID Token, no body):

1. Lookup by `firebaseUid` → if found, sync permitted fields and return (`created: false`).
2. Else lookup by email:
   - Same email with **different** `firebaseUid` → `409` (no improper linking).
   - Same email with **null** `firebaseUid` → link Firebase UID (migration path for local `POST /v1/users` users).
3. Else create minimum profile (`firebaseUid`, `email`, optional `name` from token) (`created: true`).

### Email policy

- Email is **provider data**. The API syncs it from the verified token on bootstrap when the new email is free.
- Profile PUT/PATCH **never** accept email changes.
- Changing email in production should happen in Firebase (re-auth as needed); next bootstrap syncs it.
- **Unverified emails** may bootstrap in MVP. Prefer requiring `email_verified` for sensitive operations in a later hardening task.

### Authorization

- Authorize by the authenticated `firebaseUid` → resolve local `User.id`.
- Never use email alone as the authorization identifier.
- `GET /v1/users/me` returns the local profile for the token's `firebaseUid` (`404` if not bootstrapped).
- `PUT` / `PATCH` / `DELETE` `/v1/users/:id` require ownership: path `:id` must equal the resolved local actor (`403` otherwise).
- Resource modules (vehicles, maintenances) use `UserContextGuard`:
  1. Prefer `Authorization: Bearer <firebase-id-token>`
  2. Fall back to `X-User-Id` only outside production (local adapter)

## Profile uniqueness

Values are normalized **before** uniqueness checks and persistence (digits only for documents/CNH; E.164-like for phone).

## CNH policy (MVP)

`cnh` is **optional**. It is not required to create or update a profile.

## PUT semantics

`PUT /v1/users/:id` performs a **full replacement of mutable profile fields**:

- Mutable fields: `name`, `cnh`, `document`, `documentType`, `phone`
- Omitted fields are set to `null`
- `email`, `id`, `firebaseUid`, `createdAt`, `updatedAt` are never accepted in the body

`PATCH /v1/users/:id` updates **only** the fields present in the payload. Explicit `null` clears a field.

## DELETE policy

`DELETE /v1/users/:id` performs a **physical delete**.

- Related `Vehicle` rows (and their `Maintenance` rows) are removed by Prisma/Postgres `ON DELETE CASCADE`
- Soft-delete / anonymization (`deletedAt`) is deferred to a future LGPD hardening task

## Related docs

- Firebase console providers: [`docs/firebase-providers.md`](firebase-providers.md)
