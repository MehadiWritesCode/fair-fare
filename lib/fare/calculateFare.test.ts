import { describe, it, expect } from "vitest";
import { calculateFare, compareFare } from "./calculateFare";

const cng = {
  base_distance_km: 2,
  base_fare: 40,
  per_km_rate: 12,
  min_fare: 40,
  waiting_per_min: 2,
};

const bus = {
  base_distance_km: 0,
  base_fare: 0,
  per_km_rate: 2.43,
  min_fare: 10,
  waiting_per_min: 0,
};

describe("calculateFare - CNG", () => {
  it("৪.৫ কিমি = ৭০", () => {
    expect(calculateFare(cng, 4.5)).toBe(70);
  });
  it("ঠিক ২ কিমি = ৪০", () => {
    expect(calculateFare(cng, 2)).toBe(40);
  });
  it("২ কিমির কম হলেও সর্বনিম্ন ৪০", () => {
    expect(calculateFare(cng, 1)).toBe(40);
    expect(calculateFare(cng, 0)).toBe(40);
  });
  it("৫ মিনিট অপেক্ষা = +১০", () => {
    expect(calculateFare(cng, 2, 5)).toBe(50);
  });
});

describe("calculateFare - bus", () => {
  it("কম দূরত্বে সর্বনিম্ন ১০", () => {
    expect(calculateFare(bus, 1)).toBe(10);
  });
  it("৪.৫ কিমি = ১১", () => {
    expect(calculateFare(bus, 4.5)).toBe(11);
  });
  it("১০ কিমি = ২৪", () => {
    expect(calculateFare(bus, 10)).toBe(24);
  });
});

describe("ভুল ইনপুট", () => {
  it("ঋণাত্মক দূরত্বে এরর", () => {
    expect(() => calculateFare(cng, -1)).toThrow();
  });
  it("NaN দূরত্বে এরর", () => {
    expect(() => calculateFare(cng, NaN)).toThrow();
  });
});

describe("compareFare", () => {
  it("সমান বা কম হলে fair", () => {
    expect(compareFare(70, 70).verdict).toBe("fair");
    expect(compareFare(70, 60).verdict).toBe("fair");
  });
  it("১০% এর মধ্যে বেশি হলে slightly_high", () => {
    expect(compareFare(70, 75).verdict).toBe("slightly_high");
  });
  it("১০% এর বেশি হলে overcharged", () => {
    const r = compareFare(70, 120);
    expect(r.verdict).toBe("overcharged");
    expect(r.fareDifference).toBe(50);
  });
});
