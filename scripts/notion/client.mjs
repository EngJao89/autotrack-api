/**
 * Minimal Notion REST client for task list/detail (autotrack-api tooling).
 * Read-only regarding Notion status — never updates pages.
 */

import { mapPageToTask, extractAcceptanceFromBlocks } from './mapProperties.mjs';
import { formatTaskId } from './branchName.mjs';

const NOTION_VERSION = '2022-06-28';

/**
 * @param {string} token
 * @param {string} method
 * @param {string} path
 * @param {unknown} [body]
 */
async function notionRequest(token, method, path, body) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.code ||
      `Notion API HTTP ${response.status}`;
    const err = new Error(message);
    err.code =
      response.status === 401 || response.status === 403
        ? 'NOTION_ACCESS_DENIED'
        : response.status === 404
          ? 'NOTION_NOT_FOUND'
          : 'NOTION_API_ERROR';
    err.status = response.status;
    throw err;
  }

  return payload;
}

/**
 * @param {{ token: string; databaseId: string; propertyNames: import('./mapProperties.mjs').PropertyNames; pageSize?: number }} opts
 */
export async function listTasks(opts) {
  const { token, databaseId, propertyNames, pageSize = 20 } = opts;
  /** @type {ReturnType<typeof mapPageToTask>[]} */
  const tasks = [];
  let cursor = undefined;

  do {
    const body = {
      page_size: Math.min(pageSize, 100),
      ...(cursor ? { start_cursor: cursor } : {}),
    };
    const data = await notionRequest(token, 'POST', `/databases/${databaseId}/query`, body);
    for (const page of data.results ?? []) {
      if (page.object !== 'page') continue;
      tasks.push(mapPageToTask(page, propertyNames));
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor && tasks.length < pageSize);

  return tasks.slice(0, pageSize);
}

/**
 * @param {{ token: string; databaseId: string; propertyNames: import('./mapProperties.mjs').PropertyNames; taskId: string }} opts
 */
export async function findTaskById(opts) {
  const { token, databaseId, propertyNames, taskId } = opts;
  const formatted = formatTaskId(taskId);
  if (!formatted) {
    const err = new Error(`ID de task inválido: ${taskId}`);
    err.code = 'INVALID_TASK_ID';
    throw err;
  }

  const numberMatch = formatted.match(/^[A-Za-z]+-(\d+)$/);
  const number = numberMatch ? Number(numberMatch[1]) : NaN;

  /** @type {unknown} */
  let filter;
  if (Number.isFinite(number)) {
    filter = {
      property: propertyNames.taskId,
      unique_id: { equals: number },
    };
  } else {
    filter = {
      property: propertyNames.taskId,
      rich_text: { equals: formatted },
    };
  }

  const data = await notionRequest(token, 'POST', `/databases/${databaseId}/query`, {
    filter,
    page_size: 5,
  });

  const page = (data.results ?? []).find((r) => r.object === 'page');
  if (!page) {
    const err = new Error(`Task não encontrada no board: ${formatted}`);
    err.code = 'TASK_NOT_FOUND';
    throw err;
  }

  return mapPageToTask(page, propertyNames);
}

/**
 * @param {{ token: string; pageId: string }} opts
 */
export async function fetchPageBlocks(opts) {
  const { token, pageId } = opts;
  /** @type {unknown[]} */
  const blocks = [];
  let cursor = undefined;

  do {
    const qs = new URLSearchParams({ page_size: '100' });
    if (cursor) qs.set('start_cursor', cursor);
    const data = await notionRequest(token, 'GET', `/blocks/${pageId}/children?${qs}`);
    blocks.push(...(data.results ?? []));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return blocks;
}

/**
 * @param {{ token: string; databaseId: string; propertyNames: import('./mapProperties.mjs').PropertyNames; taskId: string }} opts
 */
export async function getTaskDetails(opts) {
  const task = await findTaskById(opts);
  const blocks = await fetchPageBlocks({ token: opts.token, pageId: task.pageId });
  const acceptanceCriteria = extractAcceptanceFromBlocks(
    /** @type {Parameters<typeof extractAcceptanceFromBlocks>[0]} */ (blocks)
  );

  return {
    ...task,
    acceptanceCriteria,
  };
}
