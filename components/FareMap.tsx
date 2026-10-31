"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLng } from "@/lib/geo/distance";

const makePin = (kind: "from" | "to") =>
  L.divIcon({
    className: "",
    html: `<span class="pin pin-${kind}"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 34],
  });
const fromIcon = makePin("from");
const toIcon = makePin("to");

type Props = {
  from: LatLng | null;
  to: LatLng | null;
  path: [number, number][] | null;
  onMapClick: (p: LatLng) => void;
};

function ClickHandler({ onMapClick }: { onMapClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitView({ from, to, path }: Omit<Props, "onMapClick">) {
  const map = useMap();

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;

    const topLeft: L.PointExpression = [40, mobile ? 200 : 60];
    const bottomRight: L.PointExpression = [40, mobile ? 340 : 60];

    if (from && to) {
      const pts: L.LatLngTuple[] =
        path && path.length
          ? path
          : [
              [from.lat, from.lng],
              [to.lat, to.lng],
            ];
      map.fitBounds(L.latLngBounds(pts), {
        paddingTopLeft: topLeft,
        paddingBottomRight: bottomRight,
        maxZoom: 16,
      });
    } else if (from || to) {
      const p = (from ?? to)!;
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    }
  }, [from, to, path, map]);

  return null;
}

export default function FareMap({ from, to, path, onMapClick }: Props) {
  return (
    <MapContainer
      center={[23.8103, 90.4125]}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="topright" />
      <ClickHandler onMapClick={onMapClick} />
      <FitView from={from} to={to} path={path} />

      {from && to && path && (
        <>
          <Polyline
            positions={path}
            pathOptions={{ color: "#ffffff", weight: 9, opacity: 0.9 }}
          />
          <Polyline
            positions={path}
            pathOptions={{ color: "#17283a", weight: 5 }}
          />
        </>
      )}
      {from && to && !path && (
        <Polyline
          positions={[
            [from.lat, from.lng],
            [to.lat, to.lng],
          ]}
          pathOptions={{ color: "#17283a", weight: 4, dashArray: "8 8" }}
        />
      )}

      {from && <Marker position={[from.lat, from.lng]} icon={fromIcon} />}
      {to && <Marker position={[to.lat, to.lng]} icon={toIcon} />}
    </MapContainer>
  );
}
