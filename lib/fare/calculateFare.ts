import type { FareComparison } from "@/types/fare";

export type FareInput = {
  base_distance_km: number;
  base_fare: number;
  per_km_rate: number;
  min_fare: number;
  waiting_per_min: number;
};

// Fair fare in taka, rounded to a whole number.
// Within the base distance the fare is the base fare; beyond it, extra km are
// charged at the per-km rate. Waiting charge is added, then the minimum fare applies.
export function calculateFare(
  rule: FareInput,
  distanceKm: number,
  waitMinutes = 0,
): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("Distance must be 0 or greater");
  }
  if (!Number.isFinite(waitMinutes) || waitMinutes < 0) {
    throw new Error("Waiting time must be 0 or greater");
  }

  const extraKm = Math.max(0, distanceKm - rule.base_distance_km);
  const distanceFare = rule.base_fare + extraKm * rule.per_km_rate;
  const waitingFare = waitMinutes * rule.waiting_per_min;
  const total = Math.max(distanceFare + waitingFare, rule.min_fare);

  return Math.round(total);
}

// Compares the driver's asked fare with the fair fare.
// Up to 10% above counts as "slightly_high" to allow for rounding and small differences.
export function compareFare(
  fairFare: number,
  askedFare: number,
): FareComparison {
  const fareDifference = askedFare - fairFare;
  const percentOver = fairFare > 0 ? (fareDifference / fairFare) * 100 : 0;

  let verdict: FareComparison["verdict"] = "fair";
  if (percentOver > 10) verdict = "overcharged";
  else if (percentOver > 0) verdict = "slightly_high";

  return { fareDifference, percentOver, verdict };
}
