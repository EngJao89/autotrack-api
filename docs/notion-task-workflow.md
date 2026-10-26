# Workflow Notion → task → branch (autotrack-api)

Documentação do tooling local para consultar tasks do board Notion, ler detalhes/critérios de aceite e gerar (ou criar localmente) a branch Git neste repositório.

> Escopo **API repo only** (scripts CLI). Isto **não** é um módulo NestJS, não expõe rotas HTTP e **não** é sincronização bidirecional Notion↔GitHub.  
> Equivalente ao fluxo já consolidado no Mobile ([ATP-34](https://github.com/EngJao89/autotrack-mobile) / `docs/notion-task-workflow.md`).

## Mecanismo (localização)

| Caminho | Papel |
| --- | --- |
| `scripts/notion/cli.mjs` | CLI: `list`, `show`, `suggest-branch`, `create-branch` |
| `scripts/notion/client.mjs` | Notion REST (query database + blocks) — **somente leitura** |
| `scripts/notion/mapProperties.mjs` | Mapeamento defensivo de propriedades |
| `scripts/notion/branchName.mjs` | Prefixo por Tipo + `ATP-ID` + slug do título |
| `scripts/notion/gitBranch.mjs` | Sugestão vs criação local de branch |
| `scripts/notion/*.test.mjs` | Testes de mapeamento e nome de branch |
| `examples/notion/sanitized-task-show.json` | Exemplo sanitizado de `show` |
| `docs/notion-github.md` | Link Preview / convenções de board (sem API) |

**Não** há `NOTION_*` em `src/` nem uso dessas variáveis no runtime Nest. Credenciais ficam só no `.env` local do desenvolvedor / CI secreto.

## Mapeamento do board

Propriedades padrão (sobrescrevíveis por env):

| Env | Default no board |
| --- | --- |
| `NOTION_PROP_TASK_ID` | `ID da Task` (Unique ID `ATP-*`) |
| `NOTION_PROP_STATUS` | `Status` |
| `NOTION_PROP_TYPE` | `Tipo` |
| `NOTION_PROP_PRIORITY` | `Prioridade` |
| `NOTION_PROP_ESTIMATE` | `Estimativa` |
| `NOTION_PROP_TAGS` | `Requisito` |

Campos ausentes entram em `missingProperties` — o CLI **não inventa** valores.

### Limitações de acesso

- Token de integração Notion precisa de acesso ao database do board.
- Sem token / sem permissão → erro claro (`MISSING_NOTION_TOKEN`, `NOTION_ACCESS_DENIED`).
- Task inexistente → `TASK_NOT_FOUND`.
- Link Preview no Notion (Connections) é independente desta CLI.

## Suggest vs create (diferenciados)

| Comando | Efeito |
| --- | --- |
| `npm run notion:suggest-branch -- ATP-XX` | **Só imprime** o nome. Não altera git nem Notion. |
| `npm run notion:create-branch -- ATP-XX` | Cria branch **local** a partir de `NOTION_BASE_BRANCH` (default `master`). Não faz push, merge, PR nem muda status no Notion. |

Regras de criação:

- Confere se `origin` contém `autotrack-api` (`NOTION_EXPECTED_REPO`).
- Recusa se a branch já existir (`BRANCH_EXISTS`) — **não sobrescreve**.
- Prefixo vem do `Tipo` da task, ou `--prefix chore` para forçar (ex.: card Feature com branch chore sugerida).

Formato: `{prefix}/{ATP-ID}-{slug}`  
Ex.: `chore/ATP-35-configurar-integracao-notion-no-autotrack-api`

## Configuração

1. Crie uma [integração Notion](https://www.notion.so/my-integrations) (secret interno), ou reutilize a mesma do Mobile.
2. Compartilhe o database do board com a integração.
3. No `.env` local (nunca commitado):

```bash
NOTION_TOKEN=secret_ou_ntn_…
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# opcionais:
# NOTION_BASE_BRANCH=master
# NOTION_EXPECTED_REPO=autotrack-api
```

Nomes documentados em `.env.example` — **sem** valores secretos.

## Roteiro de uso

```bash
# Listar tasks (somente leitura)
npm run notion:list

# Detalhes + critérios de aceite
npm run notion:show -- ATP-XX

# Sugerir nome de branch (sem git)
npm run notion:suggest-branch -- ATP-XX
npm run notion:suggest-branch -- ATP-XX --prefix chore

# Criar branch local (sem push / sem escrever no Notion)
npm run notion:create-branch -- ATP-XX --prefix chore
```

## Testes

```bash
npm run notion:test
# ou junto dos unitários Nest:
npm test && npm run notion:test
```

Inclui `scripts/notion/*.test.mjs` (slug, ID, mapeamento, suggest).  
Fluxo conectado (com token local): `notion:list` / `notion:show` — evidência sanitizada em `examples/notion/sanitized-task-show.json`.

## Fora de escopo

- Sync bidirecional Notion↔GitHub, webhooks, fechar card no merge
- Criar propriedades/views no board automaticamente
- Alterar cards, PRs ou branches remotas sem autorização explícita
- Expor endpoints Nest (`/v1/notion/*`) ou acoplar o token ao runtime da API
