export const VEHICLE_YEAR_MIN = 1900;

export function getVehicleYearMax(now = new Date()): number {
  return now.getFullYear() + 1;
}
