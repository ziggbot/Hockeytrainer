// Sync between the device and the team server (docs/decisions/0005-teams-and-sync.md).
// Pure functions: which documents go up, what changed since the last sync,
// and how pulled documents merge into the local state. No network here.
//
// Documents: the team itself, its sessions and notes, and each coach's own
// drills (shared with co-coaches). Uploaded photos (drill.diagram) stay on the
// device. Last change wins per document; notes are append-only.

import type { AppState } from "../store/store";
import type { Drill, Session, SessionNote, Team } from "./types";

export type SyncKind = "team" | "session" | "note" | "drill";

export interface SyncDoc {
  kind: SyncKind;
  id: string;
  teamId?: string;
  data: Record<string, unknown>;
}

export interface PulledRecord {
  kind: SyncKind;
  id: string;
  teamId: string | null;
  ownerId: string | null;
  data: Record<string, unknown> | null;
  deleted: boolean;
  updatedAt: string;
}

/** What was last synced for each document: content hash and its team. */
export type Shadow = Record<string, { h: string; t?: string }>;
/** Documents changed on this device and not yet accepted by the server: key → time of change. */
export type Dirty = Record<string, string>;

export const keyOf = (kind: SyncKind, id: string) => `${kind}:${id}`;

export function kindOf(key: string): SyncKind {
  return key.slice(0, key.indexOf(":")) as SyncKind;
}

export function idOf(key: string): string {
  return key.slice(key.indexOf(":") + 1);
}

/** JSON with sorted keys, so the server's jsonb (which reorders keys) hashes the same. */
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? "null" : stableStringify(x))).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}

/** cyrb53: small, fast, good enough to notice that a document changed. */
export function hashDoc(data: unknown): string {
  const s = stableStringify(data);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** A drill is mine unless it came from a co-coach. */
export const isMine = (d: Drill, me: string) => !d.ownerId || d.ownerId === me;

/** The drill as it is synced: no photo (too big, stays on the device) and no owner field. */
function drillData(d: Drill): Record<string, unknown> {
  const { diagram: _diagram, ownerId: _owner, ...rest } = d;
  return rest as unknown as Record<string, unknown>;
}

/** Every local document that belongs on the server. */
export function collectDocs(state: AppState, linked: ReadonlySet<string>, me: string): Map<string, SyncDoc> {
  const docs = new Map<string, SyncDoc>();
  for (const t of state.teams) {
    if (linked.has(t.id)) docs.set(keyOf("team", t.id), { kind: "team", id: t.id, teamId: t.id, data: { ...t } });
  }
  const teamOfSession = new Map<string, string>();
  for (const s of state.sessions) {
    if (!linked.has(s.teamId)) continue;
    teamOfSession.set(s.id, s.teamId);
    docs.set(keyOf("session", s.id), { kind: "session", id: s.id, teamId: s.teamId, data: { ...s } });
  }
  for (const n of state.notes) {
    const teamId = teamOfSession.get(n.sessionId);
    if (teamId) docs.set(keyOf("note", n.id), { kind: "note", id: n.id, teamId, data: { ...n } });
  }
  if (linked.size > 0) {
    for (const d of state.ownDrills) {
      if (isMine(d, me)) docs.set(keyOf("drill", d.id), { kind: "drill", id: d.id, data: drillData(d) });
    }
  }
  return docs;
}

/**
 * Compares the device with what was last synced. Notes and teams are never
 * deleted through sync (notes are append-only; teams are left or deleted
 * through the team endpoints).
 */
export function localChanges(docs: Map<string, SyncDoc>, shadow: Shadow): { changed: string[]; removed: string[] } {
  const changed: string[] = [];
  for (const [key, doc] of docs) if (shadow[key]?.h !== hashDoc(doc.data)) changed.push(key);
  const removed = Object.keys(shadow).filter((key) => {
    const kind = kindOf(key);
    return !docs.has(key) && (kind === "session" || kind === "drill");
  });
  return { changed, removed };
}

/** Marks what changed since the last sync, keeping the time of the first change. */
export function markDirty(docs: Map<string, SyncDoc>, shadow: Shadow, dirty: Dirty, now: string): Dirty {
  const { changed, removed } = localChanges(docs, shadow);
  const next: Dirty = {};
  for (const key of [...changed, ...removed]) next[key] = dirty[key] ?? now;
  return next;
}

export interface PullResult {
  state: AppState;
  shadow: Shadow;
  dirty: Dirty;
}

/**
 * Merges pulled documents into the device's state. A local change made after
 * the server's version survives (it is pushed next); otherwise the server wins.
 * On a full pull (`full`), teams the coach is no longer in and co-coaches'
 * drills that are no longer visible are removed from the device.
 */
export function applyPull(
  state: AppState,
  records: PulledRecord[],
  opts: { me: string; shadow: Shadow; dirty: Dirty; full: boolean; teamIds: string[] }
): PullResult {
  let teams = state.teams.slice();
  let sessions = state.sessions.slice();
  let notes = state.notes.slice();
  let ownDrills = state.ownDrills.slice();
  const shadow: Shadow = { ...opts.shadow };
  const dirty: Dirty = { ...opts.dirty };
  const seenDrills = new Set<string>();

  for (const r of records) {
    const key = keyOf(r.kind, r.id);
    if (r.kind === "drill") seenDrills.add(r.id);
    const localChangedAt = dirty[key];
    if (localChangedAt && localChangedAt > r.updatedAt) continue;
    delete dirty[key];

    if (r.deleted || !r.data) {
      delete shadow[key];
      if (r.kind === "session") sessions = sessions.filter((s) => s.id !== r.id);
      if (r.kind === "drill") ownDrills = ownDrills.filter((d) => d.id !== r.id);
      continue;
    }
    shadow[key] = { h: hashDoc(r.data), t: r.teamId ?? undefined };
    if (r.kind === "team") {
      const team = { ...(r.data as unknown as Team), id: r.id };
      teams = teams.some((t) => t.id === r.id) ? teams.map((t) => (t.id === r.id ? team : t)) : [...teams, team];
    } else if (r.kind === "session") {
      const s = { ...(r.data as unknown as Session), id: r.id };
      sessions = sessions.some((x) => x.id === r.id) ? sessions.map((x) => (x.id === r.id ? s : x)) : [...sessions, s];
    } else if (r.kind === "note") {
      if (!notes.some((n) => n.id === r.id)) notes = [...notes, { ...(r.data as unknown as SessionNote), id: r.id }];
    } else if (r.kind === "drill") {
      const local = ownDrills.find((d) => d.id === r.id);
      const drill: Drill = {
        ...(r.data as unknown as Drill),
        id: r.id,
        source: "own",
        ...(local?.diagram ? { diagram: local.diagram } : {}),
        ...(r.ownerId && r.ownerId !== opts.me ? { ownerId: r.ownerId } : {})
      };
      if (!drill.ownerId) delete drill.ownerId;
      ownDrills = local ? ownDrills.map((d) => (d.id === r.id ? drill : d)) : [...ownDrills, drill];
    }
  }

  if (opts.full) {
    const member = new Set(opts.teamIds);
    const gone = new Set(
      Object.values(shadow)
        .map((s) => s.t)
        .filter((t): t is string => !!t && !member.has(t))
    );
    for (const t of teams) if (!member.has(t.id) && shadow[keyOf("team", t.id)]) gone.add(t.id);
    if (gone.size) {
      const goneSessions = new Set(sessions.filter((s) => gone.has(s.teamId)).map((s) => s.id));
      teams = teams.filter((t) => !gone.has(t.id));
      sessions = sessions.filter((s) => !gone.has(s.teamId));
      notes = notes.filter((n) => !goneSessions.has(n.sessionId));
      for (const [key, s] of Object.entries(shadow)) if (s.t && gone.has(s.t)) delete shadow[key];
    }
    // Co-coaches' drills that are no longer visible (the coach left the team).
    ownDrills = ownDrills.filter((d) => isMine(d, opts.me) || seenDrills.has(d.id));
  }

  const activeTeamId = teams.some((t) => t.id === state.activeTeamId) ? state.activeTeamId : (teams[0]?.id ?? null);
  return { state: { ...state, teams, sessions, notes, ownDrills, activeTeamId }, shadow, dirty };
}
