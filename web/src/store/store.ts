import { useSyncExternalStore } from "react";
import type { Curriculum, Drill, Session, SessionNote, SessionTemplate, Team } from "../domain/types";
import { SEED_CURRICULA } from "../content/curricula";
import { readItem, writeItem } from "./storage";

// Local-first store (spec §6: offline-first). Everything lives on this
// device in localStorage until the Supabase backend lands; the shapes match
// the planned tables so sync can be added without reshaping data.

export interface AppState {
  version: 1;
  teams: Team[];
  activeTeamId: string | null;
  /** Club curricula — seeded copy, editable by the club admin. */
  curricula: Curriculum[];
  ownDrills: Drill[];
  ownTemplates: SessionTemplate[];
  sessions: Session[];
  notes: SessionNote[];
}

const KEY = "hockeytrainer.v1";

function initialState(): AppState {
  return {
    version: 1,
    teams: [],
    activeTeamId: null,
    curricula: SEED_CURRICULA,
    ownDrills: [],
    ownTemplates: [],
    sessions: [],
    notes: []
  };
}

function load(): AppState {
  try {
    const raw = readItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== 1) return initialState();
    return { ...initialState(), ...parsed };
  } catch {
    return initialState();
  }
}

let state: AppState = load();
const listeners = new Set<() => void>();
let persistRequested = false;

function save() {
  // Fails silently on quota/private mode: the app keeps running in memory,
  // and the backup export under "Laget" is the escape hatch.
  writeItem(KEY, JSON.stringify(state));
  if (!persistRequested && typeof navigator !== "undefined" && navigator.storage?.persist) {
    persistRequested = true;
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage.persist().catch(() => {});
  }
}

export function getState(): AppState {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  save();
  listeners.forEach((l) => l());
}

/** Replace everything (backup import). */
export function replaceState(next: AppState) {
  setState(() => ({ ...initialState(), ...next }));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Another tab (or the installed PWA next to a browser tab) changed the data.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

export function newId(): string {
  // randomUUID only exists in secure contexts; plain-http LAN testing on a
  // phone isn't one.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
