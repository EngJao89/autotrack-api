# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Configured Render deployment blueprint and production bootstrap (`0.0.0.0` + `PORT`) ([ATP-24])
- Added Terminus health check with PostgreSQL connectivity on `GET /v1/health` ([ATP-22])
- Migrated Prisma datasource from SQLite to PostgreSQL ([ATP-22])
- Configured OpenAPI/Swagger documentation with `/v1` prefix and `/api/docs` UI ([ATP-15])

## [0.2.0] - 2026-10-01

### Added
- Added Docker Compose with NestJS (dev) and PostgreSQL environment ([ATP-23])
- Configured Prisma with SQLite and initial User, Vehicle and Maintenance models ([ATP-18])
- Configured GitHub Actions CI pipeline for lint, typecheck, tests and build ([ATP-11])

## [0.1.0] - 2026-09-30

### Added
- Created the initial NestJS API repository ([ATP-19])
- Initialized NestJS with strict TypeScript configuration ([ATP-20])
