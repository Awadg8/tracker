"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Point } from "@/lib/types";

type Props = {
  points: Point[];
  /** follow the latest position and show a "you are here" dot */
  live?: boolean;
  className?: string;
  /** aspect ratio as width/height */
  ratio?: number;
  emptyLabel?: string;
};

const ROUTE = "#d7301f";
const INK = "#0f1216";

export default function LiveMap({ points, live = false, className = "", ratio = 1.5, emptyLabel }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const here = useRef<L.CircleMarker | null>(null);
  const ends = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  // create the map once
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      zoomSnap: 0.5,
    }).setView([20, 0], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    line.current = L.polyline([], { color: ROUTE, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(m);
    ends.current = L.layerGroup().addTo(m);
    map.current = m;

    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);

    return () => {
      ro.disconnect();
      m.remove();
      map.current = line.current = here.current = ends.current = null;
      fitted.current = false;
    };
  }, []);

  // sync the route
  useEffect(() => {
    const m = map.current;
    const pl = line.current;
    if (!m || !pl) return;
    const latlngs = points.map((p) => [p.lat, p.lng] as L.LatLngTuple);
    pl.setLatLngs(latlngs);
    const last = latlngs[latlngs.length - 1];

    if (live) {
      if (!last) return;
      if (!here.current) {
        here.current = L.circleMarker(last, {
          radius: 8,
          color: "#fff",
          weight: 3,
          fillColor: INK,
          fillOpacity: 1,
        }).addTo(m);
      } else {
        here.current.setLatLng(last);
      }
      if (!fitted.current) {
        m.setView(last, 17, { animate: false });
        fitted.current = true;
      } else if (!m.getBounds().pad(-0.25).contains(last)) {
        m.panTo(last, { animate: true });
      }
      return;
    }

    // static view: fit the whole route, mark start and finish
    ends.current?.clearLayers();
    if (latlngs.length > 1) {
      m.fitBounds(L.latLngBounds(latlngs), { padding: [28, 28], animate: false, maxZoom: 18 });
      L.circleMarker(latlngs[0], { radius: 7, color: "#fff", weight: 3, fillColor: "#1e8e5a", fillOpacity: 1 }).addTo(ends.current!);
      L.circleMarker(last, { radius: 7, color: "#fff", weight: 3, fillColor: INK, fillOpacity: 1 }).addTo(ends.current!);
    }
  }, [points, live]);

  return (
    <div className={`relative isolate overflow-hidden bg-chalk ${className}`} style={{ aspectRatio: ratio }}>
      <div ref={el} className="absolute inset-0" role="region" aria-label="Route map" />
      {live && points.length === 0 && emptyLabel && (
        <p className="pointer-events-none absolute inset-x-0 top-3 z-[1000] mx-auto w-fit rounded-full bg-paper/95 px-3 py-1 text-sm text-ink-soft shadow">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}
