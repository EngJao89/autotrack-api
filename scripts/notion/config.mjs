/**
 * Load Notion tooling config from environment.
 * Never logs token values.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Lightweight .env loader (no dependency). Does not override existing env.
 * @param {string} filePath
 */
export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function loadDefaultEnv() {
  const root = process.cwd();
  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, '.env.local'));
}

/**
 * @returns {{
 *   token: string;
 *   databaseId: string;
 *   propertyNames: {
 *     taskId: string;
 *     status: string;
 *     type: string;
 *     priority: string;
 *     estimate: string;
 *     tags: string;
 *   };
 *   expectedRepo: string;
 *   baseBranch: string;
 * }}
 */
export function getNotionConfig() {
  loadDefaultEnv();

  const token = process.env.NOTION_TOKEN?.trim() ?? '';
  const databaseId = process.env.NOTION_DATABASE_ID?.trim() ?? '';

  if (!token) {
    const err = new Error(
      'NOTION_TOKEN ausente. Defina no .env local (nunca commitado; não é variável da API Nest).'
    );
    err.code = 'MISSING_NOTION_TOKEN';
    throw err;
  }

  if (!databaseId) {
    const err = new Error(
      'NOTION_DATABASE_ID ausente. Use o ID do database do board do projeto no Notion.'
    );
    err.code = 'MISSING_NOTION_DATABASE_ID';
    throw err;
  }

  return {
    token,
    databaseId,
    propertyNames: {
      taskId: process.env.NOTION_PROP_TASK_ID?.trim() || 'ID da Task',
      status: process.env.NOTION_PROP_STATUS?.trim() || 'Status',
      type: process.env.NOTION_PROP_TYPE?.trim() || 'Tipo',
      priority: process.env.NOTION_PROP_PRIORITY?.trim() || 'Prioridade',
      estimate: process.env.NOTION_PROP_ESTIMATE?.trim() || 'Estimativa',
      tags: process.env.NOTION_PROP_TAGS?.trim() || 'Requisito',
    },
    expectedRepo: process.env.NOTION_EXPECTED_REPO?.trim() || 'autotrack-api',
    baseBranch: process.env.NOTION_BASE_BRANCH?.trim() || 'master',
  };
}

/** Redact secrets from arbitrary text for safe logging/docs. */
export function redactSecrets(text) {
  return String(text ?? '')
    .replace(/secret_[A-Za-z0-9]+/g, 'secret_[REDACTED]')
    .replace(/ntn_[A-Za-z0-9]+/g, 'ntn_[REDACTED]')
    .replace(/(NOTION_TOKEN\s*=\s*)\S+/gi, '$1[REDACTED]');
}
