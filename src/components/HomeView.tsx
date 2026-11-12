"use client";

import { useState } from "react";
import Link from "next/link";
import { useActivities, useHydrated } from "@/lib/store";
import { fmtDuration, fmtKm, startOfWeek } from "@/lib/geo";
import ActivityCard from "./ActivityCard";

export default function HomeView() {
  const activities = useActivities();
  const hydrated = useHydrated();
  const [weekStart] = useState(() => startOfWeek(Date.now()));
  const week = activities.filter((a) => a.startedAt >= weekStart);
  const weekDist = week.reduce((s, a) => s + a.distanceM, 0);
  const weekTime = week.reduce((s, a) => s + a.durationSec, 0);
  const recent = activities.slice(0, 5);

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="num text-4xl font-bold leading-none">Stride</h1>
      </header>

      <section aria-labelledby="week" className="rounded-lg bg-ink p-4 text-paper">
        <h2 id="week" className="text-sm text-paper/70">
          This week
        </h2>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="num text-6xl font-bold leading-none">{fmtKm(weekDist, 1)}</span>
          <span className="text-paper/70">km</span>
        </div>
        <p className="mt-2 text-sm text-paper/70">
          {week.length} {week.length === 1 ? "run" : "runs"}, {fmtDuration(weekTime)} moving
        </p>
      </section>

      <Link
        href="/record"
        className="flex h-14 items-center justify-center rounded-lg bg-lane text-lg font-semibold text-paper outline-none focus-visible:ring-2 focus-visible:ring-ink active:bg-lane-deep"
      >
        Start a run
      </Link>

      <section aria-labelledby="recent" className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 id="recent" className="text-lg font-semibold">
            Recent runs
          </h2>
          {activities.length > 5 && (
            <Link href="/activities" className="text-sm text-lane">
              See all
            </Link>
          )}
        </div>
        {hydrated && recent.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink/20 p-6 text-center text-ink-soft">
            Nothing here yet. Your first run will show up here once you record it.
          </p>
        )}
        {recent.map((a) => (
          <ActivityCard key={a.id} a={a} />
        ))}
      </section>
    </div>
  );
}
