import type { FareRule, FareComparison } from "@/types/fare";

type FareInput = Pick<
  FareRule,
  | "base_distance_km"
  | "base_fare"
  | "per_km_rate"
  | "min_fare"
  | "waiting_per_min"
>;

export function calculateFare(
  rule: FareInput,
  distanceKm: number,
  waitMinutes = 0,
): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new Error("দূরত্ব ০ বা তার বেশি হতে হবে");
  }
  if (!Number.isFinite(waitMinutes) || waitMinutes < 0) {
    throw new Error("অপেক্ষার সময় ০ বা তার বেশি হতে হবে");
  }

  const extraKm = Math.max(0, distanceKm - rule.base_distance_km);
  const distanceFare = rule.base_fare + extraKm * rule.per_km_rate;
  const waitingFare = waitMinutes * rule.waiting_per_min;
  const total = Math.max(distanceFare + waitingFare, rule.min_fare);

  return Math.round(total);
}

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
