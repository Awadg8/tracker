"use client";

import Link from "next/link";
import { useActivities, useHydrated } from "@/lib/store";
import ActivityCard from "./ActivityCard";

export default function ActivitiesView() {
  const activities = useActivities();
  const hydrated = useHydrated();

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="num text-3xl font-bold">Runs</h1>
        <Link
          href="/activities/new"
          className="rounded-md px-3 py-2 text-sm font-medium text-lane outline-none focus-visible:ring-2 focus-visible:ring-lane"
        >
          Add manually
        </Link>
      </header>

      {hydrated && activities.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink/20 p-6 text-center text-ink-soft">
          No runs saved. Record one, or add a run you did without your phone.
        </p>
      )}
      {activities.map((a) => (
        <ActivityCard key={a.id} a={a} />
      ))}
    </div>
  );
}
