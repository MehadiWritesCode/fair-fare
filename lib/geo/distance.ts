export type LatLng = { lat: number; lng: number };

export type Route = {
  distanceKm: number;
  path: [number, number][] | null;
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getRoute(
  from: LatLng,
  to: LatLng,
  signal?: AbortSignal,
): Promise<Route> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM error ${res.status}`);

  const data = await res.json();
  const route = data?.routes?.[0];
  if (!route || typeof route.distance !== "number") {
    throw new Error("রুট পাওয়া যায়নি");
  }

  const coords: [number, number][] | undefined = route.geometry?.coordinates;
  return {
    distanceKm: route.distance / 1000,
    path: coords ? coords.map(([lng, lat]) => [lat, lng]) : null,
  };
}
