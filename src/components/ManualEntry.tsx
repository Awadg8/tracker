"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addActivity, newId } from "@/lib/store";

function localDateTimeValue(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManualEntry() {
  const router = useRouter();
  const [name, setName] = useState("Run");
  const [when, setWhen] = useState(() => localDateTimeValue(Date.now()));
  const [km, setKm] = useState("");
  const [h, setH] = useState("0");
  const [m, setM] = useState("");
  const [s, setS] = useState("0");
  const [err, setErr] = useState<string | null>(null);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const distanceM = Math.round(parseFloat(km) * 1000);
    const durationSec = (parseInt(h) || 0) * 3600 + (parseInt(m) || 0) * 60 + (parseInt(s) || 0);
    if (!(distanceM > 0)) return setErr("Enter a distance greater than 0.");
    if (!(durationSec > 0)) return setErr("Enter how long the run took.");
    const startedAt = new Date(when).getTime();
    if (isNaN(startedAt)) return setErr("Pick a valid date and time.");
    const id = newId();
    addActivity({
      id,
      name: name.trim() || "Run",
      startedAt,
      durationSec,
      distanceM,
      points: [],
      source: "manual",
    });
    router.replace(`/activities/${id}`);
  }

  const field =
    "mt-1 h-12 w-full rounded-md border border-ink/15 bg-paper px-3 text-base outline-none focus:border-lane focus:ring-2 focus:ring-lane/30";

  return (
    <form onSubmit={save} className="space-y-5">
      <header className="pt-2">
        <h1 className="num text-3xl font-bold">Add a run</h1>
        <p className="mt-1 text-sm text-ink-soft">For runs you did without your phone.</p>
      </header>

      <label className="block text-sm font-medium">
        Name
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="block text-sm font-medium">
        Started
        <input
          type="datetime-local"
          className={field}
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          required
        />
      </label>

      <label className="block text-sm font-medium">
        Distance (km)
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="5.00"
          className={`${field} num text-2xl`}
          value={km}
          onChange={(e) => setKm(e.target.value)}
          required
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Time</legend>
        <div className="mt-1 grid grid-cols-3 gap-2">
          {(
            [
              ["h", h, setH],
              ["min", m, setM],
              ["sec", s, setS],
            ] as const
          ).map(([unit, val, set]) => (
            <label key={unit} className="text-xs text-ink-soft">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max={unit === "h" ? 99 : 59}
                className={`${field} num mt-0 text-2xl`}
                value={val}
                onChange={(e) => set(e.target.value)}
                aria-label={unit}
              />
              <span className="mt-1 block">{unit}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {err && (
        <p role="alert" className="rounded-md bg-lane/10 px-3 py-2 text-sm text-lane-deep">
          {err}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-14 rounded-lg bg-paper font-semibold ring-1 ring-ink/15 outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="h-14 rounded-lg bg-lane font-semibold text-paper outline-none focus-visible:ring-2 focus-visible:ring-ink active:bg-lane-deep"
        >
          Save run
        </button>
      </div>
    </form>
  );
}
