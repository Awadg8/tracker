"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Point } from "@/lib/types";
import { fmtDuration, fmtKm, fmtPace, haversine, paceSecPerKm } from "@/lib/geo";
import { addActivity, newId } from "@/lib/store";
import RouteMap from "./RouteMap";

type Status = "idle" | "running" | "paused";
type Source = "gps" | "demo";

const MAX_ACCURACY_M = 40;
const MAX_SPEED_MS = 12; // anything faster than ~Usain is a GPS jump
const MIN_STEP_M = 2;

export default function Recorder() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [source, setSource] = useState<Source>("gps");
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [points, setPoints] = useState<Point[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startedAt = useRef(0);
  const segmentStart = useRef(0);
  const accumulatedMs = useRef(0);
  const lastPoint = useRef<Point | null>(null);
  const watchId = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const demoTimer = useRef<number | null>(null);
  const demoAngle = useRef(0);
  const wakeLock = useRef<WakeLockSentinel | null>(null);

  const onPoint = useCallback((p: Point) => {
    setAccuracy(p.acc ?? null);
    if (p.acc !== undefined && p.acc > MAX_ACCURACY_M) return;
    const last = lastPoint.current;
    if (last) {
      const d = haversine(last, p);
      const dt = (p.t - last.t) / 1000;
      if (d < MIN_STEP_M) return;
      if (dt > 0 && d / dt > MAX_SPEED_MS) return;
      setDistance((x) => x + d);
    }
    lastPoint.current = p;
    setPoints((ps) => [...ps, p]);
  }, []);

  const startSensors = useCallback(
    (src: Source) => {
      timer.current = window.setInterval(() => {
        setElapsed((accumulatedMs.current + (Date.now() - segmentStart.current)) / 1000);
      }, 250);

      if (src === "gps") {
        watchId.current = navigator.geolocation.watchPosition(
          (pos) => {
            setError(null);
            onPoint({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              acc: pos.coords.accuracy,
              t: pos.timestamp || Date.now(),
            });
          },
          (e) => {
            setError(
              e.code === e.PERMISSION_DENIED
                ? "Location access is off. Allow it in your browser settings to record a route."
                : "Can't get a GPS fix right now. Time still counts; move to open sky.",
            );
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 },
        );
      } else {
        // Synthetic loop around a ~400 m radius at ~3 m/s, with a little jitter.
        const base = { lat: 51.5074, lng: -0.1278 };
        demoTimer.current = window.setInterval(() => {
          demoAngle.current += 3 / 400;
          const r = 400 / 111320;
          const jitter = () => (Math.random() - 0.5) * 0.00002;
          onPoint({
            lat: base.lat + r * Math.sin(demoAngle.current) + jitter(),
            lng: base.lng + (r * Math.cos(demoAngle.current)) / Math.cos(base.lat * (Math.PI / 180)) + jitter(),
            acc: 8,
            t: Date.now(),
          });
        }, 1000);
      }

      if ("wakeLock" in navigator) {
        navigator.wakeLock.request("screen").then((l) => (wakeLock.current = l)).catch(() => {});
      }
    },
    [onPoint],
  );

  const stopSensors = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (demoTimer.current) clearInterval(demoTimer.current);
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    timer.current = demoTimer.current = watchId.current = null;
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, []);

  useEffect(() => stopSensors, [stopSensors]);

  function start(src: Source) {
    if (src === "gps" && !("geolocation" in navigator)) {
      setError("This browser has no location support. Try the demo run instead.");
      return;
    }
    if (src === "gps" && !window.isSecureContext) {
      setError(
        "Browsers only share location on HTTPS or localhost. Open the app over HTTPS (deploy it or use a tunnel), or try the demo run.",
      );
      return;
    }
    setError(null);
    setSource(src);
    startedAt.current = Date.now();
    segmentStart.current = Date.now();
    accumulatedMs.current = 0;
    setStatus("running");
    startSensors(src);
  }

  function pause() {
    accumulatedMs.current += Date.now() - segmentStart.current;
    stopSensors();
    setElapsed(accumulatedMs.current / 1000);
    lastPoint.current = null; // don't count distance covered while paused
    setStatus("paused");
  }

  function resume() {
    segmentStart.current = Date.now();
    setStatus("running");
    startSensors(source);
  }

  function reset() {
    stopSensors();
    setStatus("idle");
    setElapsed(0);
    setDistance(0);
    setPoints([]);
    setAccuracy(null);
    lastPoint.current = null;
    demoAngle.current = 0;
    accumulatedMs.current = 0;
  }

  function finish() {
    const movingMs =
      status === "running" ? accumulatedMs.current + (Date.now() - segmentStart.current) : accumulatedMs.current;
    stopSensors();
    const durationSec = Math.round(movingMs / 1000);
    if (durationSec < 5 && distance < 20) {
      reset();
      return;
    }
    const id = newId();
    const hour = new Date(startedAt.current).getHours();
    const label = hour < 11 ? "Morning run" : hour < 17 ? "Afternoon run" : "Evening run";
    addActivity({
      id,
      name: label,
      startedAt: startedAt.current,
      durationSec,
      distanceM: Math.round(distance),
      points,
      source,
    });
    router.push(`/activities/${id}`);
  }

  const avgPace = paceSecPerKm(distance, elapsed);
  const curPace = currentPace(points);
  const fix: "none" | "weak" | "good" =
    accuracy === null ? "none" : accuracy > MAX_ACCURACY_M ? "weak" : "good";

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col">
      <header className="flex items-center justify-between pt-2">
        <h1 className="num text-2xl font-bold">
          {status === "idle" ? "Record" : status === "paused" ? "Paused" : "Running"}
        </h1>
        {status !== "idle" && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 rounded-full ${
                source === "demo"
                  ? "bg-ink-soft"
                  : fix === "good"
                    ? "bg-fix"
                    : fix === "weak"
                      ? "bg-lane fix-pulse"
                      : "bg-ink-faint fix-pulse"
              }`}
            />
            {source === "demo"
              ? "Demo"
              : fix === "good"
                ? `GPS ±${Math.round(accuracy ?? 0)} m`
                : fix === "weak"
                  ? "Weak signal"
                  : "Finding GPS"}
          </p>
        )}
      </header>

      <section aria-live="off" className="mt-6">
        <p className="text-sm text-ink-soft">Time</p>
        <p className="num text-[5.5rem] font-bold leading-none tracking-tight">{fmtDuration(elapsed)}</p>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-ink/10 pt-4">
          <Big label="km" value={fmtKm(distance)} />
          <Big label="avg /km" value={fmtPace(avgPace)} />
          <Big label="now /km" value={fmtPace(curPace)} />
        </div>
      </section>

      <RouteMap points={points} live={status === "running"} ratio={1.5} className="mt-6 rounded-lg" />

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-lane/10 px-3 py-2 text-sm text-lane-deep">
          {error}
        </p>
      )}

      <div className="mt-auto pt-6">
        {status === "idle" && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => start("gps")}
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-lane text-lg font-semibold text-paper shadow-lg shadow-lane/30 outline-none focus-visible:ring-4 focus-visible:ring-ink/30 active:bg-lane-deep"
            >
              Start
            </button>
            <button
              type="button"
              onClick={() => start("demo")}
              className="block w-full py-2 text-center text-sm text-ink-soft underline-offset-4 hover:underline"
            >
              No GPS here? Try a demo run
            </button>
          </div>
        )}
        {status === "running" && (
          <div className="grid grid-cols-2 gap-3">
            <Action onClick={pause}>Pause</Action>
            <Action onClick={finish} primary>
              Finish
            </Action>
          </div>
        )}
        {status === "paused" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Action onClick={resume}>Resume</Action>
              <Action onClick={finish} primary>
                Finish
              </Action>
            </div>
            <button
              type="button"
              onClick={reset}
              className="block w-full py-2 text-center text-sm text-ink-soft underline-offset-4 hover:underline"
            >
              Discard this run
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pace over roughly the last 30 seconds of movement. */
function currentPace(points: Point[]): number | null {
  if (points.length < 2) return null;
  const end = points[points.length - 1];
  let i = points.length - 1;
  let d = 0;
  while (i > 0 && end.t - points[i - 1].t <= 30000) {
    d += haversine(points[i - 1], points[i]);
    i--;
  }
  if (i === points.length - 1) return null;
  return paceSecPerKm(d, (end.t - points[i].t) / 1000);
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="num text-4xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-ink-soft">{label}</p>
    </div>
  );
}

function Action({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-16 rounded-lg text-lg font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ink ${
        primary
          ? "bg-lane text-paper active:bg-lane-deep"
          : "bg-paper text-ink ring-1 ring-ink/15 active:bg-chalk"
      }`}
    >
      {children}
    </button>
  );
}
