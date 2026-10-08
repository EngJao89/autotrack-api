# Testing strategy (ATP-17)

## Pyramid

| Layer | Location | Notes |
|---|---|---|
| Unit | `src/**/*.spec.ts` | Mock Prisma and Firebase. No network calls. |
| E2E | `test/**/*.e2e-spec.ts` | Real Nest HTTP app via Supertest + isolated DB. |

Out of scope: load/stress, pentest, UI, real Firebase/email/push, staging data dumps.

## Isolation after PostgreSQL migration

The original ATP-17 note mentioned SQLite for E2E. The runtime now uses PostgreSQL (ATP-22), and `PrismaService` is built on `@prisma/adapter-pg`.

E2E isolation is therefore:

- dedicated database `autotrack_e2e` (default local URL on Docker port `5433`)
- override with `E2E_DATABASE_URL`
- `globalSetup` creates the DB (if missing) and runs `prisma migrate deploy`
- each suite resets tables via `resetDatabase()`

`*.db` files remain gitignored for any future SQLite artifacts.

## Helpers and fixtures

- `test/helpers/create-test-app.ts` — Nest bootstrap + validation pipe + Firebase mock
- `test/helpers/database.ts` — E2E URL, ensure DB, migrate, reset
- `test/helpers/auth.ts` — Firebase token verifier mock
- `test/fixtures/*` — reusable payloads for users/vehicles/maintenances

## Commands

```bash
npm run test        # unit
npm run test:watch
npm run test:cov    # coverage in ./coverage
npm run test:e2e
npm run test:all    # unit then e2e (runInBand)
```

## Quality rules

- Tests must be deterministic and independent of execution order
- No real credentials/tokens/external network calls
- Mocks restored between tests (`clearMocks` / `restoreMocks`)
- E2E closes the Nest app after the suite
- Failures must not leak secrets or SQL/stack details to clients
