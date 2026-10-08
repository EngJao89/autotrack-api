export const validMaintenancePayload = {
  type: 'Troca de óleo',
  description: 'Troca de óleo e filtro',
  serviceDate: '2026-10-03T00:00:00.000Z',
  odometerKm: 45000,
  costCents: 18990,
  workshopName: 'Oficina AutoTrack',
  notes: 'Próxima troca em 10.000 km',
};

export function buildMaintenancePayload(
  overrides: Partial<typeof validMaintenancePayload> = {},
) {
  return {
    ...validMaintenancePayload,
    ...overrides,
  };
}
