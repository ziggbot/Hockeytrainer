import { useSyncExternalStore } from "react";
import type { Curriculum, Drill, Session, SessionNote, SessionTemplate, Team } from "../domain/types";
import { SEED_CURRICULA } from "../content/curricula";
import { readItem, writeItem } from "./storage";

// Local-first store (spec §6: offline-first). Everything lives on this
// device in localStorage until the Supabase backend lands; the shapes match
// the planned tables so sync can be added without reshaping data.

export interface AppState {
  version: 1;
  /** The coach's own name, shown in the header. Never player data. */
  coachName: string;
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
export const MAX_COACH_NAME = 60;

function initialState(): AppState {
  return {
    version: 1,
    coachName: "",
    teams: [],
    activeTeamId: null,
    curricula: SEED_CURRICULA,
    ownDrills: [],
    ownTemplates: [],
    sessions: [],
    notes: []
  };
}

const list = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * Saved data (or an imported backup) is not trusted to be well-formed: drop
 * records the screens can't render instead of crashing on every start.
 */
export function normalizeState(raw: unknown): AppState {
  const base = initialState();
  if (!isObj(raw) || raw.version !== 1) return base;
  const teams = list<Team>(raw.teams)
    .filter((t) => isObj(t) && typeof t.id === "string" && typeof t.ageGroupId === "string")
    .map((t) => ({
      ...t,
      schedule: list<Team["schedule"][number]>(t.schedule).filter((x) => isObj(x) && typeof x.start === "string")
    }));
  const sessions = list<Session>(raw.sessions)
    .filter(
      (s) =>
        isObj(s) &&
        typeof s.id === "string" &&
        typeof s.date === "string" &&
        typeof s.start === "string" &&
        Array.isArray(s.parts)
    )
    .map((s) => ({
      ...s,
      focus: list<Session["focus"][number]>(s.focus),
      equipmentChecked: list<Session["equipmentChecked"][number]>(s.equipmentChecked)
    }));
  const curricula = list<Curriculum>(raw.curricula).filter((c) => isObj(c) && Array.isArray(c.blocks));
  return {
    version: 1,
    coachName: typeof raw.coachName === "string" ? raw.coachName.slice(0, MAX_COACH_NAME) : "",
    teams,
    activeTeamId: typeof raw.activeTeamId === "string" ? raw.activeTeamId : null,
    curricula: curricula.length > 0 ? curricula : base.curricula,
    ownDrills: list<Drill>(raw.ownDrills).filter((d) => isObj(d) && typeof d.id === "string" && Array.isArray(d.skills)),
    ownTemplates: list<SessionTemplate>(raw.ownTemplates).filter((t) => isObj(t) && Array.isArray(t.stations)),
    sessions,
    notes: list<SessionNote>(raw.notes).filter((n) => isObj(n) && typeof n.sessionId === "string")
  };
}

function load(): AppState {
  try {
    const raw = readItem(KEY);
    return raw ? normalizeState(JSON.parse(raw)) : initialState();
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
export function replaceState(next: unknown) {
  setState(() => normalizeState(next));
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
