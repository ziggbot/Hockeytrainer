import { ICE_AREAS, SKILLS, type Drill, type PartDraft, type Session, type Skill } from "./types";
import { EQUIPMENT_ORDER } from "./equipment";
import { drillIdsOf } from "./planner";

// Read-only share link (spec §5.7) without a backend: the session snapshot
// travels in the URL fragment, which browsers never send to the server.
// Seed drills ship with the app, so only their ids are encoded; the coach's
// own drills are embedded (without uploaded images, to keep links short).
// When the Supabase backend lands this becomes an unguessable token instead.

export interface SharedSession {
  v: 1;
  title: string;
  date: string;
  start: string;
  minutes: number;
  team: string;
  parts: PartDraft[];
  drills: Drill[];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(session: Session, teamName: string, drillsById: Map<string, Drill>): string {
  const own = [...new Set(drillIdsOf(session.parts))]
    .map((id) => drillsById.get(id))
    .filter((d): d is Drill => !!d && d.source === "own")
    .map(({ diagram: _diagram, ...d }) => d);
  const payload: SharedSession = {
    v: 1,
    title: session.title,
    date: session.date,
    start: session.start,
    minutes: session.minutes,
    team: teamName,
    parts: session.parts.map(({ id: _id, ...p }) => p as PartDraft),
    drills: own
  };
  return toBase64Url(JSON.stringify(payload));
}

// Anyone can craft a link, so everything decoded is validated field by
// field and rebuilt; unknown fields (and images) are dropped.
const str = (v: unknown, max = 2000): string | null => (typeof v === "string" ? v.slice(0, max) : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);

function cleanPart(p: unknown): PartDraft | null {
  const o = p as Record<string, unknown> | null;
  if (!o) return null;
  if (o.type === "drill") {
    const drillId = str(o.drillId, 100);
    const minutes = num(o.minutes);
    return drillId && minutes !== null ? { type: "drill", drillId, minutes: Math.max(1, Math.min(180, minutes)) } : null;
  }
  if (o.type === "stations" && Array.isArray(o.drillIds)) {
    const drillIds = o.drillIds
      .map((id) => str(id, 100))
      .filter((id): id is string => !!id)
      .slice(0, 8);
    const mps = num(o.minutesPerStation);
    return drillIds.length > 0 && mps !== null
      ? { type: "stations", drillIds, minutesPerStation: Math.max(1, Math.min(60, mps)) }
      : null;
  }
  return null;
}

function cleanDrill(d: unknown): Drill | null {
  const o = d as Record<string, unknown> | null;
  const id = str(o?.id, 100);
  const title = str(o?.title, 200);
  if (!o || !id || !title) return null;
  const strings = (v: unknown) =>
    Array.isArray(v)
      ? v
          .map((x) => str(x, 300))
          .filter((x): x is string => !!x)
          .slice(0, 12)
      : [];
  const skills = (Array.isArray(o.skills) ? o.skills : []).map((x) => oneOf(x, SKILLS)).filter((x): x is Skill => !!x);
  const equipment = (Array.isArray(o.equipment) ? o.equipment : [])
    .map((e) => {
      const item = oneOf((e as Record<string, unknown>)?.item, EQUIPMENT_ORDER);
      const raw = (e as Record<string, unknown>)?.count;
      const count = raw === "perPlayer" || raw === "perPair" ? raw : num(raw);
      return item && count !== null ? { item, count } : null;
    })
    .filter((e): e is Drill["equipment"][number] => !!e);
  return {
    id,
    title,
    description: str(o.description) ?? "",
    coachingPoints: strings(o.coachingPoints),
    skills: skills.length > 0 ? skills : ["gameSense"],
    kind: oneOf(o.kind, ["warmup", "drill", "game"] as const) ?? "drill",
    ageMin: num(o.ageMin) ?? 5,
    ageMax: num(o.ageMax) ?? 20,
    minutes: num(o.minutes) ?? 5,
    iceArea: oneOf(o.iceArea, ICE_AREAS) ?? "half",
    minPlayers: num(o.minPlayers) ?? 1,
    equipment,
    visibility: "private",
    source: "own"
  };
}

export function decodeShare(fragment: string): SharedSession | null {
  try {
    const data = JSON.parse(fromBase64Url(fragment.replace(/^#/, "")));
    if (data?.v !== 1 || !Array.isArray(data.parts)) return null;
    const parts = (data.parts as unknown[])
      .map(cleanPart)
      .filter((p): p is PartDraft => !!p)
      .slice(0, 40);
    return {
      v: 1,
      title: str(data.title, 200) ?? "",
      date: str(data.date, 10) ?? "",
      start: str(data.start, 5) ?? "",
      minutes: num(data.minutes) ?? 0,
      team: str(data.team, 100) ?? "",
      parts,
      drills: (Array.isArray(data.drills) ? data.drills : [])
        .map(cleanDrill)
        .filter((d: Drill | null): d is Drill => !!d)
        .slice(0, 40)
    };
  } catch {
    return null;
  }
}
