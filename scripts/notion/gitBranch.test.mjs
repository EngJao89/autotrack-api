import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { suggestBranch } from './gitBranch.mjs';

describe('suggestBranch', () => {
  it('never marks created=true', () => {
    assert.deepEqual(suggestBranch('chore/ATP-34-notion-task-workflow-api'), {
      action: 'suggest',
      branchName: 'chore/ATP-34-notion-task-workflow-api',
      created: false,
    });
  });
});
