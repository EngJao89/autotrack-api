# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Linked Firebase identity to local User via `firebaseUid`, `POST /v1/auth/bootstrap` and `GET /v1/users/me` ([ATP-30])
- Documented Firebase Google + Email/Password providers and identity policies ([ATP-30]/[ATP-31])
- Configured isolated unit/E2E test suite with helpers, fixtures and coverage scripts ([ATP-17])
- Extended User profile with CNH/document/phone and PUT/PATCH/DELETE operations ([ATP-29])
- Documented auth/user lifecycle decisions in `docs/auth-and-user-lifecycle.md` ([ATP-29])
- Standardized global DTO validation, error codes and `requestId` correlation ([ATP-14])
- Added Maintenance module with vehicle ownership, filters and CRUD ([ATP-28])
- Added Vehicles module with ownership rules and CRUD under `/v1/vehicles` ([ATP-26])
- Added Firebase Auth module with Bearer validation and `GET /v1/auth/me` ([ATP-21])

### Changed
- `UserContextGuard` prefers Bearer Firebase token (lookup by `firebaseUid`) and keeps `X-User-Id` as local-only fallback ([ATP-30])
- Unified API error responses to `{ statusCode, code, message, errors?, requestId }` ([ATP-14])
- Aligned Maintenance Prisma fields to the English API contract (`type`, `serviceDate`, `costCents`, …) ([ATP-28])
- Aligned Vehicle Prisma fields to the English API contract (`brand`, `model`, `year`, `licensePlate`, …) ([ATP-26])
- Added Users module with `POST /v1/users` and `GET /v1/users/:id` ([ATP-25])
- Configured Render deployment blueprint and production bootstrap (`0.0.0.0` + `PORT`) ([ATP-24])
- Added Terminus health check with PostgreSQL connectivity on `GET /v1/health` ([ATP-22])
- Migrated Prisma datasource from SQLite to PostgreSQL ([ATP-22])
- Configured OpenAPI/Swagger documentation with `/v1` prefix and `/api/docs` UI ([ATP-15])

### Changed
- Renamed User field `nome` to `name` to match the public API contract ([ATP-25])

## [0.2.0] - 2026-10-01

### Added
- Added Docker Compose with NestJS (dev) and PostgreSQL environment ([ATP-23])
- Configured Prisma with SQLite and initial User, Vehicle and Maintenance models ([ATP-18])
- Configured GitHub Actions CI pipeline for lint, typecheck, tests and build ([ATP-11])

## [0.1.0] - 2026-09-30

### Added
- Created the initial NestJS API repository ([ATP-19])
- Initialized NestJS with strict TypeScript configuration ([ATP-20])
