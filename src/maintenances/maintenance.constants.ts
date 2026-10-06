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
