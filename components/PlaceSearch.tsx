"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces, type Place } from "@/lib/geo/geocode";
import type { LatLng } from "@/lib/geo/distance";

type Props = {
  kind: "from" | "to";
  label: string;
  placeholder: string;
  // Committed label owned by the parent (set by map tap, GPS or swap).
  value: string;
  active: boolean;
  near: LatLng;
  onFocus: () => void;
  onSelect: (p: Place) => void;
  onClear: () => void;
  action?: React.ReactNode;
};

export default function PlaceSearch({
  kind,
  label,
  placeholder,
  value,
  active,
  near,
  onFocus,
  onSelect,
  onClear,
  action,
}: Props) {
  const uid = useId();
  const inputId = `${uid}-input`;
  const listId = `${uid}-list`;

  const [query, setQuery] = useState(value);
  const [dirty, setDirty] = useState(false); // true once the user has typed
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">(
    "idle",
  );
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [prevValue, setPrevValue] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  // When the parent changes the label, mirror it in the input without searching.
  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
    setDirty(false);
    setResults([]);
    setOpen(false);
    setStatus("idle");
  }

  // Debounced search: runs 350ms after typing stops.
  useEffect(() => {
    const q = query.trim();
    if (!dirty || q.length < 3) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const found = await searchPlaces(q, near, controller.signal);
        setResults(found);
        setStatus(found.length ? "idle" : "empty");
        setHi(-1);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setStatus("error");
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, dirty, near]);

  // Close the list when clicking outside.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const showList = open && dirty && query.trim().length >= 3;

  function pick(p: Place) {
    setQuery(p.name);
    setDirty(false);
    setOpen(false);
    setResults([]);
    onSelect(p);
  }

  function clear() {
    setQuery("");
    setDirty(false);
    setResults([]);
    setOpen(false);
    onClear();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!showList || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[hi >= 0 ? hi : 0]);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className={`place ${active ? "place-active" : ""}`}>
        <span className={`dot dot-${kind}`} aria-hidden="true" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={hi >= 0 ? `${listId}-${hi}` : undefined}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setDirty(true);
            setOpen(true);
            if (!v) onClear();
          }}
          onFocus={() => {
            onFocus();
            if (dirty) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`${label} মুছুন`}
            onClick={clear}
          >
            ×
          </button>
        )}
        {action}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label}-এর সাজেশন`}
          className="suggest"
        >
          {status === "loading" && results.length === 0 && (
            <li role="presentation" className="suggest-note">
              খোঁজা হচ্ছে…
            </li>
          )}
          {status === "empty" && (
            <li role="presentation" className="suggest-note">
              কিছু পাওয়া যায়নি। অন্যভাবে লিখুন, অথবা ম্যাপে ট্যাপ করুন।
            </li>
          )}
          {status === "error" && (
            <li role="presentation" className="suggest-note">
              সার্চ এখন কাজ করছে না। ম্যাপে ট্যাপ করে জায়গা বাছুন।
            </li>
          )}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === hi}
              onClick={() => pick(p)}
            >
              <div className="font-semibold">{p.name}</div>
              {p.sub && <div className="muted text-sm">{p.sub}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
