#!/usr/bin/env node
/**
 * Notion task workflow CLI (autotrack-api)
 *
 * Developer tooling — not part of the NestJS HTTP API.
 * Ported from autotrack-mobile (ATP-34) for the API repo counterpart.
 *
 * Commands:
 *   list                         List tasks from the configured database
 *   show <ATP-ID>                Show task details + acceptance criteria
 *   suggest-branch <ATP-ID>      Print suggested branch name (no git mutation)
 *   create-branch <ATP-ID>       Create local git branch (no push / no Notion write)
 *
 * Usage:
 *   node scripts/notion/cli.mjs list
 *   node scripts/notion/cli.mjs show ATP-34
 *   node scripts/notion/cli.mjs suggest-branch ATP-34
 *   node scripts/notion/cli.mjs create-branch ATP-34 [--prefix chore]
 */

import { getNotionConfig, redactSecrets } from './config.mjs';
import { buildBranchName } from './branchName.mjs';
import { listTasks, getTaskDetails } from './client.mjs';
import { suggestBranch, createBranch } from './gitBranch.mjs';

function printHelp() {
  console.log(`Notion task workflow (autotrack-api)

Commands:
  list
  show <ATP-ID>
  suggest-branch <ATP-ID> [--prefix <prefix>]
  create-branch <ATP-ID> [--prefix <prefix>]

suggest-branch only prints a name.
create-branch creates a local git branch from the configured base (default: master).
Neither command updates Notion status, pushes, merges, or opens a PR.
This CLI is local tooling — it is not exposed as a NestJS route.
`);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  /** @type {string[]} */
  const positional = [];
  /** @type {Record<string, string | boolean>} */
  const flags = {};

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (token === '--prefix') {
      flags.prefix = args[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (token.startsWith('--')) {
      flags[token.slice(2)] = true;
      continue;
    }
    positional.push(token);
  }

  return { command, positional, flags };
}

/**
 * @param {unknown} err
 */
function handleError(err) {
  const message = err instanceof Error ? err.message : String(err);
  const code = err && typeof err === 'object' && 'code' in err ? err.code : undefined;
  console.error(redactSecrets(message));
  if (code) {
    console.error(`code=${code}`);
  }
  process.exitCode = 1;
}

async function main() {
  const { command, positional, flags } = parseArgs(process.argv);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  const config = getNotionConfig();

  if (command === 'list') {
    const tasks = await listTasks({
      token: config.token,
      databaseId: config.databaseId,
      propertyNames: config.propertyNames,
    });
    for (const task of tasks) {
      const id = task.taskId ?? '(sem ID)';
      const status = task.status ?? '(sem status)';
      const title = task.title ?? '(sem título)';
      const missing =
        task.missingProperties.length > 0
          ? ` [missing: ${task.missingProperties.join(', ')}]`
          : '';
      console.log(`${id}\t${status}\t${title}${missing}`);
    }
    return;
  }

  const taskId = positional[0];
  if (!taskId) {
    throw Object.assign(new Error('Informe o ID da task (ex.: ATP-34).'), {
      code: 'MISSING_ARG',
    });
  }

  if (command === 'show') {
    const details = await getTaskDetails({
      token: config.token,
      databaseId: config.databaseId,
      propertyNames: config.propertyNames,
      taskId,
    });
    console.log(
      JSON.stringify(
        {
          taskId: details.taskId,
          title: details.title,
          status: details.status,
          tipo: details.tipo,
          priority: details.priority,
          estimate: details.estimate,
          tags: details.tags,
          url: details.url,
          missingProperties: details.missingProperties,
          acceptanceCriteria: details.acceptanceCriteria,
        },
        null,
        2
      )
    );
    return;
  }

  if (command === 'suggest-branch' || command === 'create-branch') {
    const details = await getTaskDetails({
      token: config.token,
      databaseId: config.databaseId,
      propertyNames: config.propertyNames,
      taskId,
    });

    const branchName = buildBranchName({
      taskId: details.taskId,
      tipo: details.tipo,
      title: details.title ?? 'task',
      prefixOverride: typeof flags.prefix === 'string' ? flags.prefix : null,
    });

    if (command === 'suggest-branch') {
      const result = suggestBranch(branchName);
      console.log(JSON.stringify({ ...result, taskId: details.taskId, title: details.title }, null, 2));
      return;
    }

    const result = createBranch({
      branchName,
      baseBranch: config.baseBranch,
      expectedRepo: config.expectedRepo,
    });
    console.log(JSON.stringify({ ...result, taskId: details.taskId, title: details.title }, null, 2));
    return;
  }

  throw Object.assign(new Error(`Comando desconhecido: ${command}`), {
    code: 'UNKNOWN_COMMAND',
  });
}

main().catch(handleError);
