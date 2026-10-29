import {
  MAINTENANCE_STATUS_TRANSITIONS,
  MAINTENANCE_STATUSES,
} from './maintenance.constants';

describe('maintenance status transitions (ATP-39)', () => {
  it('defines the three kanban statuses', () => {
    expect(MAINTENANCE_STATUSES).toEqual(['TODO', 'IN_PROGRESS', 'DONE']);
  });

  it('allows forward progress from TODO and IN_PROGRESS', () => {
    expect(MAINTENANCE_STATUS_TRANSITIONS.TODO).toEqual([
      'IN_PROGRESS',
      'DONE',
    ]);
    expect(MAINTENANCE_STATUS_TRANSITIONS.IN_PROGRESS).toEqual([
      'TODO',
      'DONE',
    ]);
  });

  it('does not allow reopen from DONE in v1', () => {
    expect(MAINTENANCE_STATUS_TRANSITIONS.DONE).toEqual([]);
  });
});
