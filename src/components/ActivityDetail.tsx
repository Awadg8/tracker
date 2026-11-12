"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteActivity, updateActivity, useActivity, useHydrated } from "@/lib/store";
import { fmtDate, fmtDuration, fmtKm, fmtPace, fmtTime, paceSecPerKm, splits } from "@/lib/geo";
import RouteMap from "./RouteMap";

export default function ActivityDetail({ id }: { id: string }) {
  const router = useRouter();
  const a = useActivity(id);
  const hydrated = useHydrated();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (!hydrated) return null;
  if (!a) {
    return (
      <div className="space-y-4 pt-2">
        <h1 className="num text-3xl font-bold">Run not found</h1>
        <p className="text-ink-soft">It may have been deleted on this device.</p>
        <Link href="/activities" className="text-lane">
          Back to runs
        </Link>
      </div>
    );
  }

  const pace = paceSecPerKm(a.distanceM, a.durationSec);
  const kmSplits = splits(a.points);
  const fastest = kmSplits.filter((s) => !s.partial).reduce((min, s) => Math.min(min, s.sec), Infinity);
  const maxSplit = kmSplits.reduce((max, s) => Math.max(max, s.sec / (s.distanceM / 1000)), 0);

  function saveName() {
    updateActivity(a!.id, { name: draft.trim() || a!.name });
    setEditing(false);
  }

  function remove() {
    deleteActivity(a!.id);
    router.replace("/activities");
  }

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <Link href="/activities" className="text-sm text-lane">
          Runs
        </Link>
        {editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
            className="mt-1 flex gap-2"
          >
            <input
              autoFocus
              className="h-11 flex-1 rounded-md border border-ink/15 bg-paper px-3 text-lg font-semibold outline-none focus:border-lane"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Run name"
            />
            <button type="submit" className="rounded-md bg-ink px-4 font-medium text-paper">
              Save
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(a.name);
              setEditing(true);
            }}
            className="mt-1 block text-left text-2xl font-semibold leading-tight outline-none focus-visible:ring-2 focus-visible:ring-lane"
            aria-label={`Rename ${a.name}`}
          >
            {a.name}
          </button>
        )}
        <p className="text-sm text-ink-soft">
          {fmtDate(a.startedAt)}, {fmtTime(a.startedAt)}
          {a.source === "manual" ? ", entered manually" : a.source === "demo" ? ", demo" : ""}
        </p>
      </header>

      <section className="rounded-lg bg-paper p-4">
        <div className="flex items-baseline gap-2">
          <span className="num text-7xl font-bold leading-none">{fmtKm(a.distanceM)}</span>
          <span className="text-ink-soft">km</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-ink/10 pt-4">
          <div>
            <dd className="num text-3xl font-semibold leading-none">{fmtDuration(a.durationSec)}</dd>
            <dt className="mt-1 text-xs text-ink-soft">moving time</dt>
          </div>
          <div>
            <dd className="num text-3xl font-semibold leading-none">{fmtPace(pace)}</dd>
            <dt className="mt-1 text-xs text-ink-soft">avg pace /km</dt>
          </div>
        </dl>
      </section>

      {a.points.length > 1 && <RouteMap points={a.points} className="rounded-lg" />}

      {kmSplits.length > 0 && (
        <section aria-labelledby="splits" className="rounded-lg bg-paper p-4">
          <h2 id="splits" className="font-semibold">
            Splits
          </h2>
          <ol className="mt-3 space-y-2">
            {kmSplits.map((s) => {
              const perKm = s.sec / (s.distanceM / 1000);
              const width = maxSplit ? Math.max(8, (perKm / maxSplit) * 100) : 0;
              const best = !s.partial && s.sec === fastest && kmSplits.length > 1;
              return (
                <li key={s.km} className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-3 text-sm">
                  <span className="num text-base font-semibold">
                    {s.partial ? fmtKm(s.distanceM, 1) : s.km}
                  </span>
                  <span className="h-2 rounded-full bg-chalk">
                    <span
                      className={`block h-2 rounded-full ${best ? "bg-lane" : "bg-ink"}`}
                      style={{ width: `${width}%` }}
                    />
                  </span>
                  <span className="num text-right text-base">{fmtPace(perKm)}</span>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs text-ink-soft">Bars show pace per km; the shortest bar is your fastest.</p>
        </section>
      )}

      <section className="pt-2">
        {confirming ? (
          <div className="rounded-lg bg-paper p-4">
            <p className="font-medium">Delete this run?</p>
            <p className="mt-1 text-sm text-ink-soft">This can&apos;t be undone.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-12 rounded-lg ring-1 ring-ink/15"
              >
                Keep
              </button>
              <button type="button" onClick={remove} className="h-12 rounded-lg bg-lane font-semibold text-paper">
                Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full py-2 text-sm text-ink-soft underline-offset-4 hover:underline"
          >
            Delete run
          </button>
        )}
      </section>
    </div>
  );
}
