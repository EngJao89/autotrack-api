import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBranchName,
  formatTaskId,
  resolveBranchPrefix,
  slugifyTitle,
} from './branchName.mjs';

describe('slugifyTitle', () => {
  it('normalizes accents and punctuation', () => {
    assert.equal(
      slugifyTitle('Configurar integração Notion'),
      'configurar-integracao-notion'
    );
    assert.equal(
      slugifyTitle('Configurar integração Notion no autotrack-api: consultar tasks'),
      'configurar-integracao-notion-no-autotrack-api-co'
    );
  });

  it('falls back when empty', () => {
    assert.equal(slugifyTitle('???'), 'task');
    assert.equal(slugifyTitle(''), 'task');
  });

  it('respects max length without trailing hyphen', () => {
    const slug = slugifyTitle('a'.repeat(80) + '-extra', { maxLength: 20 });
    assert.ok(slug.length <= 20);
    assert.doesNotMatch(slug, /-$/);
  });
});

describe('formatTaskId', () => {
  it('formats unique_id objects', () => {
    assert.equal(formatTaskId({ prefix: 'ATP', number: 34 }), 'ATP-34');
  });

  it('normalizes strings and bare numbers', () => {
    assert.equal(formatTaskId('ATP-34'), 'ATP-34');
    assert.equal(formatTaskId('34'), 'ATP-34');
  });

  it('returns null when missing', () => {
    assert.equal(formatTaskId(null), null);
    assert.equal(formatTaskId({ prefix: 'ATP' }), null);
  });
});

describe('resolveBranchPrefix', () => {
  it('maps known tipos', () => {
    assert.equal(resolveBranchPrefix('Feature'), 'feature');
    assert.equal(resolveBranchPrefix('Bug'), 'fix');
    assert.equal(resolveBranchPrefix('Docs'), 'docs');
    assert.equal(resolveBranchPrefix('Chore'), 'chore');
    assert.equal(resolveBranchPrefix('Setup'), 'chore');
    assert.equal(resolveBranchPrefix('Refactor'), 'refactor');
    assert.equal(resolveBranchPrefix('Arquitetura'), 'docs');
  });

  it('defaults empty to chore and unknown to feature', () => {
    assert.equal(resolveBranchPrefix(null), 'chore');
    assert.equal(resolveBranchPrefix('Spike'), 'feature');
  });
});

describe('buildBranchName', () => {
  it('builds prefix/ID-slug', () => {
    assert.equal(
      buildBranchName({
        taskId: 'ATP-34',
        tipo: 'Feature',
        title: 'Configurar integração Notion no autotrack-api',
      }),
      'feature/ATP-34-configurar-integracao-notion-no-autotrack-api'
    );
  });

  it('allows prefix override (suggest vs card Tipo)', () => {
    assert.equal(
      buildBranchName({
        taskId: { prefix: 'ATP', number: 34 },
        tipo: 'Feature',
        title: 'Notion task workflow',
        prefixOverride: 'chore',
      }),
      'chore/ATP-34-notion-task-workflow'
    );
  });

  it('throws when task id is missing', () => {
    assert.throws(
      () => buildBranchName({ taskId: null, title: 'x' }),
      (err) => err.code === 'MISSING_TASK_ID'
    );
  });
});
