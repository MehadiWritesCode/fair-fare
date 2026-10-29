import type { Tables, Enums } from "./database.types";

export type FareRule = Tables<"fare_rules">;
export type Report = Tables<"reports">;
export type VehicleType = Enums<"vehicle_type">;

// যেসব বাহনের সরকারি ভাড়া আছে
export type RegulatedVehicle = Extract<VehicleType, "cng" | "bus" | "minibus">;

export type FareVerdict = "fair" | "slightly_high" | "overcharged";

export type FareComparison = {
  fareDifference: number;
  percentOver: number;
  verdict: FareVerdict;
};
