"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FareComparison, FareRule, VehicleType } from "@/types/fare";
import { calculateFare, compareFare } from "@/lib/fare/calculateFare";
import { pickRule } from "@/lib/fare/pickRule";
import {
  getRoute,
  haversineKm,
  type LatLng,
  type Route,
} from "@/lib/geo/distance";
import { reverseGeocode, type Place } from "@/lib/geo/geocode";
import PlaceSearch from "./PlaceSearch";

const FareMap = dynamic(() => import("./FareMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton h-full w-full" style={{ borderRadius: 0 }} />
  ),
});

const AREA = "dhaka_metro";
const DHAKA: LatLng = { lat: 23.8103, lng: 90.4125 };

const VEHICLES: { value: VehicleType; label: string; icon: string }[] = [
  { value: "cng", label: "সিএনজি", icon: "🛺" },
  { value: "bus", label: "বাস", icon: "🚌" },
  { value: "minibus", label: "মিনিবাস", icon: "🚐" },
];

const VERDICT_UI = {
  fair: { title: "ভাড়া ন্যায্য", box: "verdict-fair", bar: "bar-fair" },
  slightly_high: {
    title: "সামান্য বেশি চাইছে",
    box: "verdict-warn",
    bar: "bar-warn",
  },
  overcharged: {
    title: "বেশি ভাড়া চাইছে",
    box: "verdict-bad",
    bar: "bar-bad",
  },
} as const;

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

// Accepts Bangla or English digits. Returns null for empty, zero or invalid input.
function parseNumber(s: string): number | null {
  const t = s
    .trim()
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const bn = (n: number, maxFraction = 0) =>
  n.toLocaleString("bn-BD", { maximumFractionDigits: maxFraction });

type Which = "from" | "to";

export default function CalculatorClient({ rules }: { rules: FareRule[] }) {
  const [vehicle, setVehicle] = useState<VehicleType>("cng");
  const [from, setFrom] = useState<LatLng | null>(null);
  const [to, setTo] = useState<LatLng | null>(null);
  const [fromLabel, setFromLabel] = useState("");
  const [toLabel, setToLabel] = useState("");
  const [active, setActive] = useState<Which>("from");
  const [geoMsg, setGeoMsg] = useState("");

  // On mobile the sheet starts collapsed so the map stays tappable.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [openedKey, setOpenedKey] = useState<string | null>(null);

  const [manual, setManual] = useState("");
  const [wait, setWait] = useState("");
  const [asked, setAsked] = useState("");

  // Prevents a stale reverse-geocode response from overwriting a newer label.
  const seq = useRef({ from: 0, to: 0 });

  /* route */
  const key = from && to ? `${from.lat},${from.lng};${to.lat},${to.lng}` : null;

  const [routeState, setRouteState] = useState<{
    key: string;
    route: Route;
    source: "road" | "straight";
  } | null>(null);

  useEffect(() => {
    if (!from || !to || !key) return;
    const controller = new AbortController();

    getRoute(from, to, controller.signal)
      .then((route) => setRouteState({ key, route, source: "road" }))
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setRouteState({
          key,
          route: { distanceKm: haversineKm(from, to), path: null },
          source: "straight",
        });
      });

    return () => controller.abort();
  }, [from, to, key]);

  const current = routeState && routeState.key === key ? routeState : null;
  const loading = key !== null && current === null;

  /* place selection */
  function applyPoint(which: Which, p: LatLng | null, label: string) {
    if (which === "from") {
      setFrom(p);
      setFromLabel(label);
    } else {
      setTo(p);
      setToLabel(label);
    }
  }

  function handleSelect(which: Which, p: Place) {
    seq.current[which]++;
    applyPoint(which, { lat: p.lat, lng: p.lng }, p.name);
    if (which === "from") setActive("to");
  }

  function handleClear(which: Which) {
    seq.current[which]++;
    applyPoint(which, null, "");
  }

  function handleMapClick(p: LatLng) {
    setSheetOpen(false);
    const which = active;
    const id = ++seq.current[which];
    applyPoint(which, p, "ম্যাপে বাছা জায়গা");
    if (which === "from") setActive("to");

    reverseGeocode(p)
      .then((name) => {
        if (!name || seq.current[which] !== id) return;
        if (which === "from") setFromLabel(name);
        else setToLabel(name);
      })
      .catch(() => {});
  }

  function swap() {
    seq.current.from++;
    seq.current.to++;
    setFrom(to);
    setTo(from);
    setFromLabel(toLabel);
    setToLabel(fromLabel);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setGeoMsg("এই ব্রাউজারে লোকেশন সাপোর্ট নেই।");
      return;
    }
    setGeoMsg("আপনার অবস্থান খোঁজা হচ্ছে…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoMsg("");
        seq.current.from++;
        applyPoint(
          "from",
          { lat: pos.coords.latitude, lng: pos.coords.longitude },
          "আমার অবস্থান",
        );
        setActive("to");
      },
      () => setGeoMsg("অবস্থান পাওয়া যায়নি। ব্রাউজারে লোকেশনের অনুমতি দিন।"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  /* fare calculation */
  const manualKm = parseNumber(manual);
  const distanceKm = manualKm ?? current?.route.distanceKm ?? null;
  const waitMin = parseNumber(wait) ?? 0;
  const askedFare = parseNumber(asked);

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

  // Open the sheet once when a new route's result first appears.
  if (fair !== null && key && openedKey !== key) {
    setOpenedKey(key);
    setSheetOpen(true);
  }

  return (
    <main className="app">
      <div className="sidebar">
        <header className="px-5 pt-5 max-md:sr-only">
          <Link
            href="/"
            className="muted inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            <span aria-hidden="true">←</span> হোম
          </Link>
          <h1 className="font-display mt-2 text-3xl font-extrabold leading-none">
            ভাড়া কত?
          </h1>
          <p className="muted mt-1 text-sm">সরকারি রেটে ন্যায্য ভাড়া যাচাই</p>
        </header>

        {/* search */}

        <section className="search-card" aria-label="যাত্রাপথ">
          <div className="mobile-bar flex items-center">
            <Link href="/" className="icon-btn" aria-label="হোমে ফিরুন">
              ←
            </Link>
          </div>

          <div className="space-y-2">
            <PlaceSearch
              kind="from"
              label="শুরুর জায়গা"
              placeholder="কোথা থেকে যাবেন?"
              value={fromLabel}
              active={active === "from"}
              near={DHAKA}
              onFocus={() => setActive("from")}
              onSelect={(p) => handleSelect("from", p)}
              onClear={() => handleClear("from")}
              action={
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="আমার অবস্থান ব্যবহার করুন"
                  onClick={locateMe}
                >
                  📍
                </button>
              }
            />
            <PlaceSearch
              kind="to"
              label="গন্তব্য"
              placeholder="কোথায় যাবেন?"
              value={toLabel}
              active={active === "to"}
              near={DHAKA}
              onFocus={() => setActive("to")}
              onSelect={(p) => handleSelect("to", p)}
              onClear={() => handleClear("to")}
              action={
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="শুরু আর গন্তব্য অদলবদল করুন"
                  onClick={swap}
                >
                  ⇅
                </button>
              }
            />
          </div>

          <p
            className={`muted mt-2 px-1 text-sm ${geoMsg ? "" : "max-md:hidden"}`}
            aria-live="polite"
          >
            {geoMsg ||
              `লিখে খুঁজুন, অথবা ম্যাপে ট্যাপ করুন (এখন বাছছেন: ${
                active === "from" ? "শুরু" : "গন্তব্য"
              })`}
          </p>
        </section>

        {/* result */}
        <section className="sheet" aria-label="ভাড়ার ফলাফল">
          <button
            type="button"
            className="sheet-handle md:hidden"
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? "ফলাফল ছোট করুন" : "ফলাফল বড় করুন"}
            onClick={() => setSheetOpen((o) => !o)}
          >
            <span />
          </button>

          <div role="radiogroup" aria-label="বাহন" className="flex gap-2">
            {VEHICLES.map((v) => (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={vehicle === v.value}
                className="chip"
                onClick={() => setVehicle(v.value)}
              >
                <span aria-hidden="true">{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>

          {!sheetOpen && (
            <p className="py-2 text-center font-semibold md:hidden">
              {fair !== null
                ? `ন্যায্য ভাড়া ৳${bn(fair)}`
                : "ম্যাপে শুরু ও গন্তব্য বাছুন"}
            </p>
          )}

          <div className={`${sheetOpen ? "block" : "hidden"} md:block`}>
            <div className="mt-3 space-y-3">
              {!rule && (
                <p className="verdict verdict-bad">
                  এই বাহনের জন্য রেট ডেটাবেসে নেই।
                </p>
              )}

              {rule && loading && (
                <div className="skeleton" style={{ height: 112 }} />
              )}

              {rule && !loading && fair === null && (
                <p className="muted py-2">
                  শুরু ও গন্তব্য বাছলেই ন্যায্য ভাড়া দেখাব।
                </p>
              )}

              {fair !== null && distanceKm !== null && (
                <>
                  <div className="fare-hero">
                    <p className="text-sm font-semibold">ন্যায্য ভাড়া</p>
                    <p className="fare-number">৳{bn(fair)}</p>
                    <p className="mt-1 text-sm">
                      {bn(distanceKm, 1)} কিমি
                      {manualKm !== null
                        ? ", আপনার দেওয়া দূরত্ব"
                        : current?.source === "road"
                          ? ", গাড়ির রাস্তা ধরে"
                          : ", সরলরেখায় আনুমানিক"}
                    </p>
                  </div>

                  {manualKm === null && current?.source === "straight" && (
                    <p className="verdict verdict-warn text-sm">
                      রুট আনা যায়নি, তাই সোজা দূরত্ব ধরেছি। আসল রাস্তা এর চেয়ে
                      বড় হতে পারে, ভাড়াও একটু বেশি হতে পারে।
                    </p>
                  )}

                  <div>
                    <label htmlFor="asked" className="mb-1 block font-semibold">
                      চালক কত চাইলেন? (টাকা)
                    </label>
                    <input
                      id="asked"
                      className="input"
                      inputMode="decimal"
                      placeholder="যেমন ১২০"
                      value={asked}
                      onChange={(e) => setAsked(e.target.value)}
                    />
                  </div>

                  {comparison && askedFare !== null && (
                    <Verdict
                      fair={fair}
                      asked={askedFare}
                      comparison={comparison}
                    />
                  )}
                </>
              )}

              <details className="hairline rounded-xl px-3 py-2">
                <summary className="cursor-pointer font-semibold">
                  দূরত্ব বা অপেক্ষা নিজে দিন
                </summary>
                <div className="mt-3 grid gap-3">
                  <div>
                    <label
                      htmlFor="manual"
                      className="mb-1 block text-sm font-medium"
                    >
                      দূরত্ব (কিমি), দিলে ম্যাপের বদলে এটাই ধরব
                    </label>
                    <input
                      id="manual"
                      className="input"
                      inputMode="decimal"
                      placeholder={
                        current ? bn(current.route.distanceKm, 1) : "যেমন ৪.৫"
                      }
                      value={manual}
                      onChange={(e) => setManual(e.target.value)}
                    />
                  </div>
                  {vehicle === "cng" && (
                    <div>
                      <label
                        htmlFor="wait"
                        className="mb-1 block text-sm font-medium"
                      >
                        জ্যামে বা অপেক্ষায় কত মিনিট গেল
                      </label>
                      <input
                        id="wait"
                        className="input"
                        inputMode="decimal"
                        placeholder="০"
                        value={wait}
                        onChange={(e) => setWait(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </details>

              {rule && (
                <p className="muted text-xs leading-relaxed">
                  রেট কার্যকর: {rule.effective_from}
                  {rule.source_url && (
                    <>
                      {" "}
                      <a
                        href={rule.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        সোর্স দেখুন
                      </a>
                    </>
                  )}
                  । জ্যাম বা রুট বদলালে আসল দূরত্ব একটু আলাদা হতে পারে।
                </p>
              )}

              <p className="muted text-xs">
                মানচিত্র © OpenStreetMap contributors। জায়গা খোঁজা: Photon।
                রুট: OSRM।
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="map-wrap">
        <FareMap
          from={from}
          to={to}
          path={current?.route.path ?? null}
          onMapClick={handleMapClick}
        />
      </div>
    </main>
  );
}

function Verdict({
  fair,
  asked,
  comparison,
}: {
  fair: number;
  asked: number;
  comparison: FareComparison;
}) {
  const ui = VERDICT_UI[comparison.verdict];
  const max = Math.max(fair, asked);
  const diff = Math.round(comparison.fareDifference);
  const pct = Math.round(comparison.percentOver);

  let detail: string;
  if (comparison.verdict === "overcharged") {
    detail = `সরকারি রেটে ৳${bn(fair)} হওয়ার কথা। চালক ৳${bn(diff)} (${bn(pct)}%) বেশি চাইছেন।`;
  } else if (comparison.verdict === "slightly_high") {
    detail = `৳${bn(diff)} বেশি, তবে পার্থক্য সামান্য।`;
  } else {
    detail = "চাওয়া ভাড়া সরকারি রেটের সমান বা কম।";
  }

  return (
    <div className={`verdict ${ui.box}`} role="status">
      <p className="font-display text-xl font-bold leading-tight">{ui.title}</p>
      <p className="mt-1 text-sm">{detail}</p>

      <div className="mt-3 space-y-2 text-sm">
        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2">
          <span>ন্যায্য</span>
          <div className="bar-track">
            <div
              className="bar-fill bar-fair"
              style={{ width: `${(fair / max) * 100}%` }}
            />
          </div>
          <b className="text-right">৳{bn(fair)}</b>
        </div>
        <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2">
          <span>চালক</span>
          <div className="bar-track">
            <div
              className={`bar-fill ${ui.bar}`}
              style={{ width: `${(asked / max) * 100}%` }}
            />
          </div>
          <b className="text-right">৳{bn(asked)}</b>
        </div>
      </div>
    </div>
  );
}
