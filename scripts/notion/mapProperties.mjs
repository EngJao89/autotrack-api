/**
 * Map Notion page properties → task summary without assuming missing fields.
 */

import { formatTaskId } from './branchName.mjs';

/**
 * @param {Record<string, unknown> | null | undefined} properties
 * @param {string} name
 */
export function getProperty(properties, name) {
  if (!properties || typeof properties !== 'object') {
    return null;
  }
  if (!(name in properties)) {
    return null;
  }
  return /** @type {Record<string, unknown>} */ (properties[name]);
}

/**
 * @param {Record<string, unknown> | null} prop
 */
export function readTitle(prop) {
  if (!prop || prop.type !== 'title' || !Array.isArray(prop.title)) {
    return null;
  }
  const text = prop.title.map((t) => t?.plain_text ?? '').join('').trim();
  return text || null;
}

/**
 * @param {Record<string, unknown> | null} prop
 */
export function readSelect(prop) {
  if (!prop) return null;
  if (prop.type === 'select') {
    return prop.select?.name ?? null;
  }
  if (prop.type === 'status') {
    return prop.status?.name ?? null;
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null} prop
 */
export function readMultiSelect(prop) {
  if (!prop || prop.type !== 'multi_select' || !Array.isArray(prop.multi_select)) {
    return [];
  }
  return prop.multi_select.map((item) => item?.name).filter(Boolean);
}

/**
 * @param {Record<string, unknown> | null} prop
 */
export function readUniqueId(prop) {
  if (!prop) return null;
  if (prop.type === 'unique_id') {
    return formatTaskId(prop.unique_id ?? null);
  }
  if (prop.type === 'rich_text' && Array.isArray(prop.rich_text)) {
    const text = prop.rich_text.map((t) => t?.plain_text ?? '').join('').trim();
    return formatTaskId(text || null);
  }
  if (prop.type === 'title') {
    return formatTaskId(readTitle(prop));
  }
  return null;
}

/**
 * @typedef {object} PropertyNames
 * @property {string} taskId
 * @property {string} status
 * @property {string} type
 * @property {string} [priority]
 * @property {string} [estimate]
 * @property {string} [tags]
 */

/**
 * @param {{
 *   id: string;
 *   url?: string;
 *   properties?: Record<string, unknown>;
 * }} page
 * @param {PropertyNames} names
 */
export function mapPageToTask(page, names) {
  const properties = page.properties ?? {};
  const missing = [];

  const titleProp = getProperty(properties, 'Nome') ?? getProperty(properties, 'Name');
  // Title is always under the database title property — try common names then first title-typed
  let title = readTitle(/** @type {Record<string, unknown> | null} */ (titleProp));
  if (!title) {
    for (const value of Object.values(properties)) {
      const t = readTitle(/** @type {Record<string, unknown>} */ (value));
      if (t) {
        title = t;
        break;
      }
    }
  }
  if (!title) {
    missing.push('title');
  }

  const taskIdProp = getProperty(properties, names.taskId);
  const taskId = readUniqueId(/** @type {Record<string, unknown> | null} */ (taskIdProp));
  if (!taskId) {
    missing.push(names.taskId);
  }

  const statusProp = getProperty(properties, names.status);
  const status = readSelect(/** @type {Record<string, unknown> | null} */ (statusProp));
  if (statusProp == null) {
    missing.push(names.status);
  }

  const typeProp = getProperty(properties, names.type);
  const tipo = readSelect(/** @type {Record<string, unknown> | null} */ (typeProp));
  if (typeProp == null) {
    missing.push(names.type);
  }

  const priority = names.priority
    ? readSelect(/** @type {Record<string, unknown> | null} */ (getProperty(properties, names.priority)))
    : null;
  const estimate = names.estimate
    ? readSelect(/** @type {Record<string, unknown> | null} */ (getProperty(properties, names.estimate)))
    : null;
  const tags = names.tags
    ? readMultiSelect(/** @type {Record<string, unknown> | null} */ (getProperty(properties, names.tags)))
    : [];

  return {
    pageId: page.id,
    url: page.url ?? null,
    title: title ?? null,
    taskId,
    status,
    tipo,
    priority,
    estimate,
    tags,
    missingProperties: missing,
  };
}

/**
 * Extract acceptance-criteria-like lines from Notion block children (sanitized).
 * @param {Array<{ type?: string; to_do?: { checked?: boolean; rich_text?: Array<{ plain_text?: string }> }; heading_2?: { rich_text?: Array<{ plain_text?: string }> }; heading_3?: { rich_text?: Array<{ plain_text?: string }> }; paragraph?: { rich_text?: Array<{ plain_text?: string }> } }>} blocks
 */
export function extractAcceptanceFromBlocks(blocks) {
  /** @type {string[]} */
  const criteria = [];
  let inAcceptance = false;

  for (const block of blocks ?? []) {
    const heading =
      plainFromRich(block.heading_2?.rich_text) ||
      plainFromRich(block.heading_3?.rich_text) ||
      plainFromRich(block.paragraph?.rich_text);

    if (heading && /crit[eé]rios?\s+de\s+aceite/i.test(heading)) {
      inAcceptance = true;
      continue;
    }

    if (
      inAcceptance &&
      (block.type === 'heading_2' || block.type === 'heading_3') &&
      heading &&
      !/crit[eé]rios?\s+de\s+aceite/i.test(heading)
    ) {
      break;
    }

    if (block.type === 'to_do') {
      const text = plainFromRich(block.to_do?.rich_text);
      if (text) {
        criteria.push(`${block.to_do?.checked ? '[x]' : '[ ]'} ${text}`);
      }
    }
  }

  return criteria;
}

/**
 * @param {Array<{ plain_text?: string }> | undefined} rich
 */
function plainFromRich(rich) {
  if (!Array.isArray(rich)) return '';
  return rich.map((t) => t?.plain_text ?? '').join('').trim();
}
