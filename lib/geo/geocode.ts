import type { LatLng } from "./distance";

export type Place = {
  id: string;
  name: string;
  sub: string;
  lat: number;
  lng: number;
};

const BD_BBOX = "88.0,20.5,92.7,26.8";
const PHOTON = "https://photon.komoot.io";

type Feature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");

function toPlace(f: Feature, i: number): Place | null {
  const p = f.properties ?? {};
  const [lng, lat] = f.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  const name = str(p.name) || str(p.street) || str(p.district) || str(p.city);
  if (!name) return null;

  const sub = [
    str(p.street),
    str(p.district),
    str(p.locality),
    str(p.city),
    str(p.state),
  ]
    .filter((x, idx, arr) => x && x !== name && arr.indexOf(x) === idx)
    .join(", ");

  return {
    id: `${str(p.osm_type)}${String(p.osm_id ?? i)}-${i}`,
    name,
    sub,
    lat,
    lng,
  };
}

export async function searchPlaces(
  query: string,
  near: LatLng,
  signal?: AbortSignal,
): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "6",
    bbox: BD_BBOX,
    lat: String(near.lat),
    lon: String(near.lng),
  });
  const res = await fetch(`${PHOTON}/api/?${params}`, { signal });
  if (!res.ok) throw new Error(`Photon error ${res.status}`);

  const data = await res.json();
  const features: Feature[] = data?.features ?? [];
  return features.map(toPlace).filter((p): p is Place => p !== null);
}

export async function reverseGeocode(
  p: LatLng,
  signal?: AbortSignal,
): Promise<string | null> {
  const params = new URLSearchParams({
    lat: String(p.lat),
    lon: String(p.lng),
  });
  const res = await fetch(`${PHOTON}/reverse?${params}`, { signal });
  if (!res.ok) return null;

  const data = await res.json();
  const feature: Feature | undefined = data?.features?.[0];
  if (!feature) return null;
  return toPlace(feature, 0)?.name ?? null;
}
