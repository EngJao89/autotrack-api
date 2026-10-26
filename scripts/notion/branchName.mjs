/**
 * Branch name generation from Notion task fields (autotrack-api tooling).
 * Pure helpers — safe to unit-test without credentials.
 */

/** @type {Record<string, string>} */
export const TYPE_TO_PREFIX = {
  feature: 'feature',
  bug: 'fix',
  correção: 'fix',
  correcao: 'fix',
  fix: 'fix',
  docs: 'docs',
  documentação: 'docs',
  documentacao: 'docs',
  chore: 'chore',
  setup: 'chore',
  infra: 'chore',
  arquitetura: 'docs',
  architecture: 'docs',
  refactor: 'refactor',
};

/**
 * @param {string} text
 * @param {{ maxLength?: number }} [options]
 */
export function slugifyTitle(text, options = {}) {
  const maxLength = options.maxLength ?? 48;
  const normalized = String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  if (!normalized) {
    return 'task';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength).replace(/-+$/g, '');
  return truncated || 'task';
}

/**
 * @param {string | null | undefined} tipo
 */
export function resolveBranchPrefix(tipo) {
  if (!tipo || !String(tipo).trim()) {
    return 'chore';
  }
  const key = String(tipo).trim().toLowerCase();
  return TYPE_TO_PREFIX[key] ?? 'feature';
}

/**
 * Normalize official Notion task id (Unique ID or text).
 * Accepts "ATP-34", "34", { prefix, number }.
 * @param {unknown} raw
 * @returns {string | null}
 */
export function formatTaskId(raw) {
  if (raw == null) {
    return null;
  }

  if (typeof raw === 'object') {
    const number = /** @type {{ number?: unknown; prefix?: unknown }} */ (raw).number;
    const prefix = /** @type {{ number?: unknown; prefix?: unknown }} */ (raw).prefix;
    if (typeof number !== 'number' || !Number.isFinite(number)) {
      return null;
    }
    const p = typeof prefix === 'string' && prefix.trim() ? prefix.trim() : 'ATP';
    return `${p}-${number}`;
  }

  const text = String(raw).trim();
  if (!text) {
    return null;
  }

  const full = text.match(/^([A-Za-z]+)-(\d+)$/);
  if (full) {
    return `${full[1].toUpperCase()}-${full[2]}`;
  }

  if (/^\d+$/.test(text)) {
    return `ATP-${text}`;
  }

  return text.toUpperCase();
}

/**
 * @param {{
 *   taskId: string | null;
 *   tipo?: string | null;
 *   title: string;
 *   prefixOverride?: string | null;
 * }} input
 */
export function buildBranchName(input) {
  const taskId = formatTaskId(input.taskId);
  if (!taskId) {
    const err = new Error('Task ID ausente: não é possível gerar o nome da branch.');
    err.code = 'MISSING_TASK_ID';
    throw err;
  }

  const prefix =
    (input.prefixOverride && String(input.prefixOverride).trim()) ||
    resolveBranchPrefix(input.tipo);
  const slug = slugifyTitle(input.title);

  return `${prefix}/${taskId}-${slug}`;
}
