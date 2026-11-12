"use client";

import { useSyncExternalStore } from "react";
import type { Activity } from "./types";

const KEY = "stride.activities.v1";
const EMPTY: Activity[] = [];

let cache: Activity[] | null = null;
const listeners = new Set<() => void>();

function read(): Activity[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Activity[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Activity[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or unavailable; keep in-memory copy
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

/** All activities, newest first. Empty on the server and during hydration. */
export function useActivities(): Activity[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useActivity(id: string): Activity | undefined {
  return useActivities().find((a) => a.id === id);
}

/** false during SSR and hydration, true once client state is trustworthy. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addActivity(a: Activity) {
  write([a, ...read()].sort((x, y) => y.startedAt - x.startedAt));
}

export function updateActivity(id: string, patch: Partial<Activity>) {
  write(read().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

export function deleteActivity(id: string) {
  write(read().filter((a) => a.id !== id));
}
