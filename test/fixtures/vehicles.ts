export const validVehiclePayload = {
  brand: 'Toyota',
  model: 'Corolla',
  version: 'XEi 2.0',
  year: 2022,
  licensePlate: 'ABC1D23',
  color: 'Prata',
  fuelType: 'flex',
  odometerKm: 45000,
};

export function buildVehiclePayload(
  overrides: Partial<typeof validVehiclePayload> = {},
) {
  return {
    ...validVehiclePayload,
    ...overrides,
  };
}
