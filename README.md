# Autotrack API

[![CI](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml/badge.svg)](https://github.com/EngJao89/autotrack-api/actions/workflows/ci.yml)

API REST em **NestJS** + **TypeScript** para um sistema de rastreamento veicular. Projeto de portfólio focado em boas práticas de arquitetura, tipagem e versionamento.

> Status atual: setup inicial do repositório e da estrutura base da aplicação.

## Stack

| Tecnologia | Uso |
|---|---|
| NestJS 12 | Framework HTTP e organização modular |
| TypeScript | Tipagem estática |
| Jest + Supertest | Testes unitários e e2e |
| Oxlint + Prettier | Lint e formatação |
| GitHub Actions | Integração contínua |
| Commitizen | Commits no padrão Conventional Commits |

## Pré-requisitos

- Node.js 24+ (recomendado; mínimo 24.9 para os testes com Jest + ESM)
- npm

## Como rodar

```bash
# instalar dependências
npm install

# desenvolvimento (watch mode)
npm run start:dev

# build de produção
npm run build
npm run start:prod
```

A API sobe em `http://localhost:3000` por padrão (`PORT` via variável de ambiente).

## Integração contínua

A cada push e pull request nas branches `main`/`master`, o GitHub Actions executa:

1. Instalação determinística (`npm ci`)
2. Lint
3. Typecheck
4. Testes unitários e e2e
5. Build

Comandos locais equivalentes:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Scripts úteis

```bash
npm run start:dev   # sobe a API em modo watch
npm run build       # compila para dist/
npm run lint        # analisa o código com Oxlint
npm run typecheck   # verifica tipagem TypeScript
npm run format      # formata com Prettier
npm run test        # testes unitários
npm run test:e2e    # testes end-to-end
npm run test:cov    # cobertura de testes
npm run commit      # commit assistido (Commitizen)
```

## Arquitetura

Estrutura inicial gerada pelo NestJS, com organização modular:

```text
src/
├── main.ts                 # bootstrap da aplicação
├── app.module.ts           # módulo raiz
├── app.controller.ts       # controllers HTTP
├── app.service.ts          # regras de negócio da camada de app
└── app.controller.spec.ts  # testes unitários
test/
├── app.e2e-spec.ts         # testes e2e
└── jest-e2e.json
```

À medida que o domínio evoluir, os módulos de negócio (ex.: veículos, rastreamento, autenticação) devem ficar isolados em pastas próprias sob `src/`, seguindo o padrão de módulos do NestJS.

## Commits

Este repositório usa [Conventional Commits](https://www.conventionalcommits.org/) via Commitizen:

```bash
npm run commit
```

## Licença

Projeto privado / não licenciado (`UNLICENSED`).
