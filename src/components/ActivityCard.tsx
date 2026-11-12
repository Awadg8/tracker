import Link from "next/link";
import type { Activity } from "@/lib/types";
import { fmtDate, fmtDuration, fmtKm, fmtPace, fmtTime, paceSecPerKm } from "@/lib/geo";
import RouteMap from "./RouteMap";

export default function ActivityCard({ a }: { a: Activity }) {
  return (
    <Link
      href={`/activities/${a.id}`}
      className="block rounded-lg bg-paper p-4 outline-none ring-lane focus-visible:ring-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{a.name}</p>
          <p className="text-sm text-ink-soft">
            {fmtDate(a.startedAt)}, {fmtTime(a.startedAt)}
          </p>
        </div>
        {a.points.length > 1 && (
          <RouteMap points={a.points} ratio={1.4} className="w-20 shrink-0 rounded" />
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="km" value={fmtKm(a.distanceM)} />
        <Stat label="time" value={fmtDuration(a.durationSec)} />
        <Stat label="/km" value={fmtPace(paceSecPerKm(a.distanceM, a.durationSec))} />
      </dl>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dd className="num text-2xl font-semibold leading-none">{value}</dd>
      <dt className="mt-1 text-xs text-ink-soft">{label}</dt>
    </div>
  );
}
