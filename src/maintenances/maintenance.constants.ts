export const MAINTENANCE_TYPES = [
  'Preventiva',
  'Corretiva',
  'Revisão',
  'Troca de óleo',
  'Pneus',
  'Freios',
  'Elétrica',
  'Outro',
] as const;

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

/**
 * Kanban statuses (ATP-39).
 * Labels: TODO = A fazer, IN_PROGRESS = Em andamento, DONE = Concluído.
 * Historical records without an explicit workflow default to DONE.
 */
export const MAINTENANCE_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;

export type MaintenanceStatusValue = (typeof MAINTENANCE_STATUSES)[number];

/** Allowed explicit transitions. Reopen from DONE is out of scope for v1. */
export const MAINTENANCE_STATUS_TRANSITIONS: Record<
  MaintenanceStatusValue,
  readonly MaintenanceStatusValue[]
> = {
  TODO: ['IN_PROGRESS', 'DONE'],
  IN_PROGRESS: ['TODO', 'DONE'],
  DONE: [],
};
