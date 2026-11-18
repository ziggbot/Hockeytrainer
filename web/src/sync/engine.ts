import { useSyncExternalStore } from "react";
import {
  applyPull,
  collectDocs,
  hashDoc,
  idOf,
  keyOf,
  kindOf,
  markDirty,
  type Dirty,
  type PulledRecord,
  type Shadow
} from "../domain/sync";
import { SPORT } from "../sport";
import { readItem, removeItem, writeItem } from "../store/storage";
import { getState, setState, subscribeState } from "../store/store";
import { getAccount, setAccount, type Account } from "./account";
import { ApiError, TEAMS_ENABLED, call } from "./api";

// Background sync with the team server. The app never waits for it: every
// screen works on local data, and sync catches up when there is a signal.

interface Meta {
  userId: string;
  cursor: number;
  scope: string;
  /** Teams this coach is in on the server (this sport). */
  linked: string[];
  shadow: Shadow;
  dirty: Dirty;
  lastFull: string | null;
}

export type SyncPhase = "off" | "syncing" | "ok" | "offline" | "error";
export interface SyncStatus {
  phase: SyncPhase;
  at: string | null;
  message?: string;
}

const META_KEY = `${SPORT.storagePrefix}.sync`;
const FULL_EVERY_MS = 12 * 3600_000;
const PUSH_BATCH = 100;

const emptyMeta = (userId: string): Meta => ({
  userId,
  cursor: 0,
  scope: "",
  linked: [],
  shadow: {},
  dirty: {},
  lastFull: null
});

function loadMeta(userId: string): Meta {
  try {
    const raw = readItem(META_KEY);
    const m = raw ? (JSON.parse(raw) as Meta) : null;
    return m && m.userId === userId ? m : emptyMeta(userId);
  } catch {
    return emptyMeta(userId);
  }
}

const saveMeta = (m: Meta) => writeItem(META_KEY, JSON.stringify(m));

// ── Status for the UI ──
let status: SyncStatus = { phase: "off", at: null };
const statusListeners = new Set<() => void>();
function setStatus(next: SyncStatus) {
  status = next;
  statusListeners.forEach((l) => l());
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      statusListeners.add(l);
      return () => statusListeners.delete(l);
    },
    () => status,
    () => status
  );
}

/** Teams this coach shares through the server (for the UI). */
export function linkedTeams(): string[] {
  const acc = getAccount();
  return acc ? loadMeta(acc.user.id).linked : [];
}

// ── One sync round ──
let running: Promise<void> | null = null;
let again = false;

export function syncNow(opts: { full?: boolean } = {}): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = runSync(opts.full ?? false).finally(() => {
    running = null;
    if (again) {
      again = false;
      void syncNow();
    }
  });
  return running;
}

async function runSync(forceFull: boolean) {
  const acc = getAccount();
  if (!TEAMS_ENABLED || !acc) {
    setStatus({ phase: "off", at: null });
    return;
  }
  setStatus({ ...status, phase: "syncing" });
  try {
    const meta = loadMeta(acc.user.id);
    await linkLocalTeams(acc, meta);
    await push(acc, meta);
    await pull(acc, meta, forceFull);
    saveMeta(meta);
    setStatus({ phase: "ok", at: new Date().toISOString() });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      // The login is no longer valid (password changed, or logged out elsewhere).
      setAccount(null);
      setStatus({ phase: "error", at: status.at, message: err.message });
      return;
    }
    setStatus({
      phase: err instanceof ApiError && err.offline ? "offline" : "error",
      at: status.at,
      message: err instanceof Error ? err.message : undefined
    });
  }
}

/** Every team on this device goes to the server; the coach who links it is head coach. */
async function linkLocalTeams(acc: Account, meta: Meta) {
  for (const team of getState().teams) {
    if (meta.linked.includes(team.id)) continue;
    try {
      await call("POST", "/teams", { id: team.id, sport: SPORT.id, data: team }, acc.token);
      meta.linked.push(team.id);
      meta.shadow[keyOf("team", team.id)] = { h: hashDoc(team), t: team.id };
    } catch (err) {
      // 409: the id exists and this coach is not in it (e.g. was removed). Leave it local.
      if (!(err instanceof ApiError && err.status === 409)) throw err;
    }
  }
}

async function push(acc: Account, meta: Meta) {
  const docs = collectDocs(getState(), new Set(meta.linked), acc.user.id);
  meta.dirty = markDirty(docs, meta.shadow, meta.dirty, new Date().toISOString());
  const keys = Object.keys(meta.dirty);
  for (let i = 0; i < keys.length; i += PUSH_BATCH) {
    const batch = keys.slice(i, i + PUSH_BATCH);
    const records = batch.map((key) => {
      const doc = docs.get(key);
      const updatedAt = meta.dirty[key];
      return doc
        ? { kind: doc.kind, id: doc.id, teamId: doc.teamId, data: doc.data, updatedAt }
        : { kind: kindOf(key), id: idOf(key), teamId: meta.shadow[key]?.t, data: null, deleted: true, updatedAt };
    });
    const res = await call<{ rejected: { kind: string; id: string }[] }>(
      "POST",
      "/sync",
      { sport: SPORT.id, records },
      acc.token
    );
    const rejected = new Set(res.rejected.map((r) => `${r.kind}:${r.id}`));
    for (const key of batch) {
      delete meta.dirty[key];
      // Rejected: the server's version is newer or not ours to change; the pull brings it.
      if (rejected.has(key)) continue;
      const doc = docs.get(key);
      if (doc) meta.shadow[key] = { h: hashDoc(doc.data), t: doc.teamId };
      else delete meta.shadow[key];
    }
  }
}

interface PullPage {
  scope: string;
  full: boolean;
  cursor: number;
  more: boolean;
  teams: { id: string; role: string }[];
  records: PulledRecord[];
}

async function pull(acc: Account, meta: Meta, forceFull: boolean) {
  const stale = !meta.lastFull || Date.now() - Date.parse(meta.lastFull) > FULL_EVERY_MS;
  let since = forceFull || stale ? 0 : meta.cursor;
  let scope = forceFull || stale ? "" : meta.scope;
  const records: PulledRecord[] = [];
  let page: PullPage;
  let full = false;
  for (let i = 0; i < 40; i++) {
    page = await call<PullPage>(
      "GET",
      `/sync?sport=${SPORT.id}&since=${since}&scope=${encodeURIComponent(scope)}`,
      undefined,
      acc.token
    );
    if (page.full && i > 0) records.length = 0; // scope changed mid-way: start over
    full = full || page.full;
    records.push(...page.records);
    since = page.cursor;
    scope = page.scope;
    if (!page.more) break;
  }
  const result = applyPull(getState(), records, {
    me: acc.user.id,
    shadow: meta.shadow,
    dirty: meta.dirty,
    full,
    teamIds: page!.teams.map((t) => t.id)
  });
  meta.shadow = result.shadow;
  meta.dirty = result.dirty;
  meta.cursor = since;
  meta.scope = scope;
  meta.linked = page!.teams.map((t) => t.id);
  if (full) meta.lastFull = new Date().toISOString();
  saveMeta(meta);
  if (records.length || full) {
    applyingPull = true;
    try {
      setState(() => result.state);
    } finally {
      applyingPull = false;
    }
  }
}

// State changes made by a pull must not schedule another round.
let applyingPull = false;

// ── Account and team lifecycle ──

export async function signIn(next: Account) {
  setAccount(next);
  removeItem(META_KEY);
  await syncNow({ full: true });
}

export async function signOut() {
  const acc = getAccount();
  if (acc) await call("POST", "/auth/logout", {}, acc.token).catch(() => undefined);
  setAccount(null);
  removeItem(META_KEY);
  setStatus({ phase: "off", at: null });
}

/** After leaving or deleting a team on the server: forget it here without sending deletions. */
export function forgetTeam(teamId: string) {
  const acc = getAccount();
  if (!acc) return;
  const meta = loadMeta(acc.user.id);
  meta.linked = meta.linked.filter((id) => id !== teamId);
  for (const [key, s] of Object.entries(meta.shadow)) if (s.t === teamId) delete meta.shadow[key];
  saveMeta(meta);
}

// ── Triggers: after edits (debounced), when the signal returns, when the app comes back, and once a minute ──
let started = false;
export function startSync() {
  if (started || !TEAMS_ENABLED) return;
  started = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  subscribeState(() => {
    if (applyingPull || !getAccount()) return;
    clearTimeout(timer);
    timer = setTimeout(() => void syncNow(), 2000);
  });
  window.addEventListener("online", () => void syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void syncNow();
  });
  setInterval(() => {
    if (document.visibilityState === "visible" && getAccount()) void syncNow();
  }, 60_000);
  void syncNow();
}
