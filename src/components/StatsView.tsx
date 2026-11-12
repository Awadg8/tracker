"use client";

import { useState } from "react";
import { useActivities, useHydrated } from "@/lib/store";
import { fmtDuration, fmtKm, fmtPace, paceSecPerKm, startOfWeek } from "@/lib/geo";

const WEEKS = 8;
const WEEK_MS = 7 * 24 * 3600 * 1000;

export default function StatsView() {
  const activities = useActivities();
  const hydrated = useHydrated();

  const [thisWeek] = useState(() => startOfWeek(Date.now()));
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = thisWeek - (WEEKS - 1 - i) * WEEK_MS;
    const dist = activities
      .filter((a) => a.startedAt >= start && a.startedAt < start + WEEK_MS)
      .reduce((s, a) => s + a.distanceM, 0);
    return { start, dist };
  });
  const maxWeek = Math.max(...weeks.map((w) => w.dist), 1);

  const totalDist = activities.reduce((s, a) => s + a.distanceM, 0);
  const totalTime = activities.reduce((s, a) => s + a.durationSec, 0);
  const longest = activities.reduce((m, a) => Math.max(m, a.distanceM), 0);
  const bestPace = activities
    .filter((a) => a.distanceM >= 1000)
    .map((a) => paceSecPerKm(a.distanceM, a.durationSec))
    .filter((p): p is number => p !== null)
    .reduce((m, p) => Math.min(m, p), Infinity);
  const best5k = activities
    .filter((a) => a.distanceM >= 5000)
    .map((a) => (a.durationSec * 5000) / a.distanceM)
    .reduce((m, t) => Math.min(m, t), Infinity);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="num text-3xl font-bold">Stats</h1>
      </header>

      <section aria-labelledby="weekly" className="rounded-lg bg-paper p-4">
        <h2 id="weekly" className="font-semibold">
          Last {WEEKS} weeks
        </h2>
        <p className="text-sm text-ink-soft">Kilometres per week</p>
        <ol className="mt-4 flex h-36 items-end gap-2" aria-label="Weekly distance">
          {weeks.map((w, i) => {
            const h = (w.dist / maxWeek) * 100;
            const current = i === WEEKS - 1;
            return (
              <li key={w.start} className="flex flex-1 flex-col items-center gap-1">
                <span className="num text-xs text-ink-soft">{w.dist > 0 ? fmtKm(w.dist, 0) : ""}</span>
                <span
                  className={`w-full rounded-t ${current ? "bg-lane" : "bg-ink"}`}
                  style={{ height: `${Math.max(h, w.dist > 0 ? 4 : 1)}%` }}
                  aria-label={`${fmtKm(w.dist, 1)} km`}
                />
                <span className="text-[10px] text-ink-soft">
                  {new Date(w.start).toLocaleDateString(undefined, { day: "numeric", month: "numeric" })}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="totals" className="rounded-lg bg-paper p-4">
        <h2 id="totals" className="font-semibold">
          All time
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat value={fmtKm(totalDist, 1)} label="km" />
          <Stat value={String(activities.length)} label="runs" />
          <Stat value={fmtDuration(totalTime)} label="moving time" />
          <Stat value={fmtKm(longest)} label="longest run, km" />
        </dl>
      </section>

      <section aria-labelledby="bests" className="rounded-lg bg-paper p-4">
        <h2 id="bests" className="font-semibold">
          Personal bests
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5">
          <Stat value={isFinite(bestPace) ? fmtPace(bestPace) : "–:––"} label="fastest avg pace /km" />
          <Stat value={isFinite(best5k) ? fmtDuration(best5k) : "––:––"} label="best 5 km" />
        </dl>
        {hydrated && activities.length === 0 && (
          <p className="mt-4 text-sm text-ink-soft">Record a run and your numbers will start filling in.</p>
        )}
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="num text-4xl font-semibold leading-none">{value}</dd>
      <dt className="mt-1 text-xs text-ink-soft">{label}</dt>
    </div>
  );
}
