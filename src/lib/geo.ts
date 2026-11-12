import type { Point } from "./types";

const R = 6371000;

export function haversine(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function fmtDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(sec).padStart(2, "0")}`;
}

export function fmtKm(metres: number, digits = 2): string {
  return (metres / 1000).toFixed(digits);
}

/** seconds per km, or null when there is not enough distance to be meaningful */
export function paceSecPerKm(distanceM: number, durationSec: number): number | null {
  if (distanceM < 20 || durationSec <= 0) return null;
  return durationSec / (distanceM / 1000);
}

export function fmtPace(secPerKm: number | null): string {
  if (secPerKm === null || !isFinite(secPerKm) || secPerKm > 59 * 60) return "–:––";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s === 60 ? 0 : s).padStart(2, "0")}`;
}

export type Split = { km: number; sec: number; partial: boolean; distanceM: number };

/** Per-kilometre splits derived from the GPS trace. */
export function splits(points: Point[]): Split[] {
  if (points.length < 2) return [];
  const out: Split[] = [];
  let cum = 0;
  let kmStartT = points[0].t;
  let kmStartDist = 0;
  let km = 1;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const d = haversine(prev, cur);
    const before = cum;
    cum += d;
    while (cum >= km * 1000) {
      // interpolate the time at which the km boundary was crossed
      const frac = (km * 1000 - before) / d;
      const tCross = prev.t + frac * (cur.t - prev.t);
      out.push({ km, sec: (tCross - kmStartT) / 1000, partial: false, distanceM: 1000 });
      kmStartT = tCross;
      kmStartDist = km * 1000;
      km++;
    }
  }
  const rem = cum - kmStartDist;
  if (rem > 50) {
    out.push({
      km,
      sec: (points[points.length - 1].t - kmStartT) / 1000,
      partial: true,
      distanceM: rem,
    });
  }
  return out;
}

export function totalDistance(points: Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += haversine(points[i - 1], points[i]);
  return d;
}

/** SVG path for a route, fitted into a w×h box with padding. */
export function routePath(points: Point[], w: number, h: number, pad = 8): string {
  if (points.length < 2) return "";
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  // scale longitude by cos(lat) so the trace isn't stretched
  const kx = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLng - minLng) * kx, 1e-6);
  const spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - spanX * scale) / 2;
  const oy = (h - spanY * scale) / 2;
  return points
    .map((p, i) => {
      const x = ox + (p.lng - minLng) * kx * scale;
      const y = h - (oy + (p.lat - minLat) * scale);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Monday 00:00 of the week containing `ms`, local time. */
export function startOfWeek(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return d.getTime();
}
