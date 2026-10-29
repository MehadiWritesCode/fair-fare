"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { FareRule, VehicleType } from "@/types/fare";
import { calculateFare, compareFare } from "@/lib/fare/calculateFare";
import { pickRule } from "@/lib/fare/pickRule";
import {
  getRoadDistanceKm,
  haversineKm,
  type LatLng,
} from "@/lib/geo/distance";

const FareMap = dynamic(() => import("./FareMap"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-lg bg-gray-100" />,
});

const AREA = "dhaka_metro";

const VEHICLES: { value: VehicleType; label: string }[] = [
  { value: "cng", label: "সিএনজি" },
  { value: "bus", label: "বাস" },
  { value: "minibus", label: "মিনিবাস" },
];

const VERDICT_UI = {
  fair: { text: "ন্যায্য ভাড়া", cls: "bg-green-100 text-green-800" },
  slightly_high: { text: "সামান্য বেশি", cls: "bg-yellow-100 text-yellow-800" },
  overcharged: { text: "অতিরিক্ত চাইছে", cls: "bg-red-100 text-red-800" },
} as const;

function toPositive(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export default function CalculatorClient({ rules }: { rules: FareRule[] }) {
  const [vehicle, setVehicle] = useState<VehicleType>("cng");
  const [from, setFrom] = useState<LatLng | null>(null);
  const [to, setTo] = useState<LatLng | null>(null);
  const [mapDistance, setMapDistance] = useState<number | null>(null);
  const [distanceNote, setDistanceNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [manual, setManual] = useState("");
  const [wait, setWait] = useState("");
  const [asked, setAsked] = useState("");

  useEffect(() => {
    if (!from || !to) {
      setMapDistance(null);
      setDistanceNote("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);

    getRoadDistanceKm(from, to, controller.signal)
      .then((km) => {
        setMapDistance(km);
        setDistanceNote("রাস্তার দূরত্ব (OSRM, গাড়ির রুট)");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setMapDistance(haversineKm(from, to));
        setDistanceNote(
          "সরলরেখার দূরত্ব (আনুমানিক, প্রকৃত রাস্তার চেয়ে কম হতে পারে)",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [from, to]);

  const handleMapClick = (p: LatLng) => {
    if (!from) setFrom(p);
    else if (!to) setTo(p);
    else {
      setFrom(p);
      setTo(null);
    }
  };

  const reset = () => {
    setFrom(null);
    setTo(null);
    setManual("");
  };

  const manualKm = toPositive(manual);
  const distanceKm = manualKm ?? mapDistance;
  const waitMin = toPositive(wait) ?? 0;
  const askedFare = toPositive(asked);

  const rule = useMemo(() => pickRule(rules, vehicle, AREA), [rules, vehicle]);

  const fair = useMemo(() => {
    if (!rule || distanceKm === null) return null;
    try {
      return calculateFare(rule, distanceKm, waitMin);
    } catch {
      return null;
    }
  }, [rule, distanceKm, waitMin]);

  const comparison =
    fair !== null && askedFare !== null ? compareFare(fair, askedFare) : null;

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">ভাড়া যাচাই</h1>

      <div>
        <label className="mb-1 block text-sm font-medium">বাহন</label>
        <div className="flex gap-2">
          {VEHICLES.map((v) => (
            <button
              key={v.value}
              onClick={() => setVehicle(v.value)}
              className={`rounded-lg border px-4 py-2 ${
                vehicle === v.value
                  ? "bg-black text-white"
                  : "hover:bg-gray-100"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          ম্যাপে প্রথমে <b className="text-green-700">শুরু</b>, তারপর{" "}
          <b className="text-red-700">গন্তব্য</b> ট্যাপ করো।
        </p>
        <FareMap from={from} to={to} onMapClick={handleMapClick} />
        <button onClick={reset} className="text-sm underline">
          পয়েন্ট মুছে নতুন করে শুরু
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            দূরত্ব (কিমি, হাতে দিলে ম্যাপের বদলে এটা ধরবে)
          </label>
          <input
            inputMode="decimal"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder={mapDistance ? mapDistance.toFixed(1) : "যেমন 4.5"}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        {vehicle === "cng" && (
          <div>
            <label className="mb-1 block text-sm font-medium">
              অপেক্ষা (মিনিট)
            </label>
            <input
              inputMode="decimal"
              value={wait}
              onChange={(e) => setWait(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium">
            চালক কত চাইল (টাকা)
          </label>
          <input
            inputMode="decimal"
            value={asked}
            onChange={(e) => setAsked(e.target.value)}
            placeholder="যেমন 120"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <section className="space-y-2 rounded-lg border p-4">
        {loading && <p className="text-gray-500">দূরত্ব বের করা হচ্ছে...</p>}

        {!rule && (
          <p className="text-red-600">এই বাহনের জন্য রেট ডেটাবেসে নেই।</p>
        )}

        {rule && distanceKm === null && !loading && (
          <p className="text-gray-500">
            ম্যাপে দুই পয়েন্ট বাছো অথবা দূরত্ব লেখো।
          </p>
        )}

        {fair !== null && distanceKm !== null && (
          <>
            <p className="text-sm text-gray-600">
              দূরত্ব: {distanceKm.toFixed(1)} কিমি
              {manualKm === null && distanceNote && ` · ${distanceNote}`}
            </p>
            <p className="text-3xl font-bold">ন্যায্য ভাড়া: ৳{fair}</p>

            {comparison && (
              <div
                className={`rounded-lg p-3 ${
                  VERDICT_UI[comparison.verdict].cls
                }`}
              >
                <p className="font-semibold">
                  {VERDICT_UI[comparison.verdict].text}
                </p>
                {comparison.fareDifference > 0 && (
                  <p>
                    ৳{Math.round(comparison.fareDifference)} বেশি চাইছে (
                    {Math.round(comparison.percentOver)}%)
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              রেট কার্যকর: {rule?.effective_from}
              {rule?.source_url && (
                <>
                  {" · "}
                  <a
                    href={rule.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    সোর্স
                  </a>
                </>
              )}
            </p>
          </>
        )}
      </section>
    </main>
  );
}
