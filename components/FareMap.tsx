"use client";

import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import type { LatLng } from "@/lib/geo/distance";

type Props = {
  from: LatLng | null;
  to: LatLng | null;
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

export default function FareMap({ from, to, onMapClick }: Props) {
  return (
    <MapContainer
      center={[23.8103, 90.4125]}
      zoom={12}
      className="h-80 w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onMapClick={onMapClick} />
      {from && (
        <CircleMarker
          center={[from.lat, from.lng]}
          radius={10}
          pathOptions={{ color: "#16a34a", fillOpacity: 0.8 }}
        />
      )}
      {to && (
        <CircleMarker
          center={[to.lat, to.lng]}
          radius={10}
          pathOptions={{ color: "#dc2626", fillOpacity: 0.8 }}
        />
      )}
      {from && to && (
        <Polyline
          positions={[
            [from.lat, from.lng],
            [to.lat, to.lng],
          ]}
          pathOptions={{ color: "#2563eb", dashArray: "6" }}
        />
      )}
    </MapContainer>
  );
}
