import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractAcceptanceFromBlocks,
  mapPageToTask,
} from './mapProperties.mjs';

const names = {
  taskId: 'ID da Task',
  status: 'Status',
  type: 'Tipo',
  priority: 'Prioridade',
  estimate: 'Estimativa',
  tags: 'Requisito',
};

describe('mapPageToTask', () => {
  it('maps present fields and lists missing ones without inventing values', () => {
    const task = mapPageToTask(
      {
        id: 'page-1',
        url: 'https://www.notion.so/example',
        properties: {
          Nome: {
            type: 'title',
            title: [{ plain_text: 'Configurar integração Notion' }],
          },
          'ID da Task': {
            type: 'unique_id',
            unique_id: { prefix: 'ATP', number: 34 },
          },
          Status: {
            type: 'status',
            status: { name: 'In progress' },
          },
          // Tipo ausente de propósito
        },
      },
      names
    );

    assert.equal(task.taskId, 'ATP-34');
    assert.equal(task.title, 'Configurar integração Notion');
    assert.equal(task.status, 'In progress');
    assert.equal(task.tipo, null);
    assert.ok(task.missingProperties.includes('Tipo'));
    assert.ok(!task.missingProperties.includes('ID da Task'));
  });

  it('supports rich_text task ids', () => {
    const task = mapPageToTask(
      {
        id: 'page-2',
        properties: {
          Name: {
            type: 'title',
            title: [{ plain_text: 'Demo' }],
          },
          'ID da Task': {
            type: 'rich_text',
            rich_text: [{ plain_text: 'ATP-10' }],
          },
          Status: { type: 'status', status: { name: 'Done' } },
          Tipo: { type: 'select', select: { name: 'Chore' } },
        },
      },
      names
    );

    assert.equal(task.taskId, 'ATP-10');
    assert.equal(task.tipo, 'Chore');
    assert.deepEqual(task.missingProperties, []);
  });
});

describe('extractAcceptanceFromBlocks', () => {
  it('collects to-dos under Critérios de aceite until next heading', () => {
    const criteria = extractAcceptanceFromBlocks([
      {
        type: 'heading_2',
        heading_2: { rich_text: [{ plain_text: 'Critérios de aceite' }] },
      },
      {
        type: 'to_do',
        to_do: {
          checked: false,
          rich_text: [{ plain_text: 'Consulta retorna tasks autorizadas' }],
        },
      },
      {
        type: 'to_do',
        to_do: {
          checked: true,
          rich_text: [{ plain_text: 'ID na branch é o oficial' }],
        },
      },
      {
        type: 'heading_2',
        heading_2: { rich_text: [{ plain_text: 'Plano de consolidação' }] },
      },
      {
        type: 'to_do',
        to_do: {
          checked: false,
          rich_text: [{ plain_text: 'Não deve entrar' }],
        },
      },
    ]);

    assert.deepEqual(criteria, [
      '[ ] Consulta retorna tasks autorizadas',
      '[x] ID na branch é o oficial',
    ]);
  });
});
