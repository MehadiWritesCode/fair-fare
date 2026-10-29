import type { FareRule, VehicleType } from "@/types/fare";

export function pickRule(
  rules: FareRule[],
  vehicle: VehicleType,
  area: string,
  onDate = new Date(),
): FareRule | null {
  const today = onDate.toISOString().slice(0, 10);
  const matches = rules
    .filter(
      (r) =>
        r.vehicle_type === vehicle &&
        r.area === area &&
        r.effective_from <= today,
    )
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return matches[0] ?? null;
}
