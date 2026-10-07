import type { AgeGroup, Drill, PartDraft, SessionPart, SessionTemplate, Skill } from "./types";
import { ageOverlaps } from "./curriculum";

// "Plan practice" (spec §5.4): suggest a session that matches the team's
// current block, sized to the ice slot.

export const MIN_PART_MINUTES = 3;
export const MIN_STATION_MINUTES = 3;

export function partMinutes(p: PartDraft | SessionPart): number {
  return p.type === "drill" ? p.minutes : p.minutesPerStation * p.drillIds.length;
}

export function totalMinutes(parts: (PartDraft | SessionPart)[]): number {
  return parts.reduce((sum, p) => sum + partMinutes(p), 0);
}

export function drillIdsOf(parts: (PartDraft | SessionPart)[]): string[] {
  return parts.flatMap((p) => (p.type === "drill" ? [p.drillId] : p.drillIds));
}

/**
 * Scale part durations so the total equals `target` minutes. Proportional
 * first, then single-minute corrections on plain drill parts (the game at the
 * end first, then the longest ones). Station rotations only change in whole
 * rotation steps, so the remainder always lands on plain drills.
 */
export function fitToMinutes<T extends PartDraft | SessionPart>(parts: T[], target: number): T[] {
  const total = totalMinutes(parts);
  if (total === 0 || total === target) return parts;
  const factor = target / total;
  const scaled = parts.map((p) =>
    p.type === "drill"
      ? { ...p, minutes: Math.max(MIN_PART_MINUTES, Math.round(p.minutes * factor)) }
      : { ...p, minutesPerStation: Math.max(MIN_STATION_MINUTES, Math.round(p.minutesPerStation * factor)) }
  ) as T[];

  let diff = target - totalMinutes(scaled);
  // Order of preference for absorbing the remainder: last part first (usually
  // the game), then longest.
  const order = scaled
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.type === "drill")
    .sort(
      (a, b) => (b.i === scaled.length - 1 ? 1 : 0) - (a.i === scaled.length - 1 ? 1 : 0) || partMinutes(b.p) - partMinutes(a.p)
    )
    .map(({ i }) => i);
  let guard = 1000;
  while (diff !== 0 && order.length > 0 && guard-- > 0) {
    let moved = false;
    for (const i of order) {
      if (diff === 0) break;
      const p = scaled[i];
      if (p.type !== "drill") continue;
      if (diff > 0) {
        scaled[i] = { ...p, minutes: p.minutes + 1 } as T;
        diff--;
        moved = true;
      } else if (p.minutes > MIN_PART_MINUTES) {
        scaled[i] = { ...p, minutes: p.minutes - 1 } as T;
        diff++;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return scaled;
}

export interface PlanContext {
  ageGroup: AgeGroup;
  playerCount: number;
  /** Focus skills of the current block (may be empty between blocks). */
  focus: Skill[];
  /** The age group's target skills, used when there is no block. */
  targetSkills: Skill[];
  minutes: number;
  drills: Drill[];
  templates: SessionTemplate[];
  /** 0 = best suggestion; higher values give alternatives ("Nytt förslag"). */
  variant: number;
}

export interface PlanSuggestion {
  title?: string;
  /** Skills the suggestion was built around, for a generated title. */
  focus: Skill[];
  parts: PartDraft[];
  templateId?: string;
}

const overlap = (a: Skill[], b: Skill[]) => a.filter((s) => b.includes(s)).length;

/** Templates usable for this team, best match first. */
export function matchingTemplates(ctx: Pick<PlanContext, "ageGroup" | "focus" | "templates" | "drills">): SessionTemplate[] {
  const known = new Set(ctx.drills.map((d) => d.id));
  return (
    ctx.templates
      .filter((t) => t.ageGroupIds.includes(ctx.ageGroup.id))
      .filter((t) => drillIdsOf(t.parts).every((id) => known.has(id)))
      // A template whose main focus is the block's main focus beats one that
      // only shares a secondary skill.
      .map((t) => ({
        t,
        shared: overlap(t.focus, ctx.focus),
        score: overlap(t.focus, ctx.focus) * 2 + (t.focus[0] === ctx.focus[0] ? 1 : 0)
      }))
      .filter(({ shared }) => ctx.focus.length === 0 || shared > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ t }) => t)
  );
}

export function suggestPlan(ctx: PlanContext): PlanSuggestion {
  const templates = matchingTemplates(ctx);
  if (ctx.variant < templates.length) {
    const t = templates[ctx.variant];
    return { title: t.title, focus: t.focus, parts: fitToMinutes(t.parts, ctx.minutes), templateId: t.id };
  }
  return generatePlan(ctx, ctx.variant - templates.length);
}

/** Deterministic PRNG so a suggestion is stable until the coach asks for a new one. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rotate<T>(list: T[], by: number): T[] {
  if (list.length === 0) return list;
  const k = by % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Build a session from the drill library: warm-up → focus work → game.
 * Young teams (≤10 years) get the focus work as a cross-ice station rotation,
 * which is how most of them train; older teams get drills in sequence.
 * Longer slots get more drills rather than longer ones. Each `seed` rotates
 * the candidate lists so "Nytt förslag" gives a different plan.
 */
export function generatePlan(ctx: PlanContext, seed: number): PlanSuggestion {
  const focus = ctx.focus.length > 0 ? ctx.focus : ctx.targetSkills.slice(0, 2);
  const rand = mulberry32(hashString(`${ctx.ageGroup.id}|${focus.join(",")}|${seed}`));

  const usable = (slack: number) =>
    ctx.drills.filter(
      (d) => ageOverlaps(d, ctx.ageGroup, slack) && d.minPlayers <= ctx.playerCount && !d.skills.includes("goalie")
    );
  let pool = usable(0);
  if (pool.length < 8) pool = usable(2);

  const ranked = (kind: Drill["kind"], filter: (d: Drill) => boolean = () => true) => {
    const scored = pool
      .filter((d) => d.kind === kind && filter(d))
      .map((d) => ({
        d,
        onFocus: overlap(d.skills, focus) > 0,
        score:
          overlap(d.skills, focus) * 3 +
          overlap(d.skills, ctx.targetSkills) +
          (kind === "game" && d.skills.includes("gameSense") ? 1 : 0) +
          rand() * 1.5
      }))
      .sort((a, b) => b.score - a.score);
    const on = scored.filter((x) => x.onFocus).map((x) => x.d);
    const off = scored.filter((x) => !x.onFocus).map((x) => x.d);
    return [...rotate(on, seed), ...rotate(off, seed)];
  };

  const target = ctx.minutes;
  const warmup = ranked("warmup")[0];
  const game = ranked("game")[0];
  const warmupMinutes = warmup?.minutes ?? 0;
  // About a quarter of the slot, but short games (relays, "tömma boet")
  // shouldn't stretch far past their natural length.
  const gameMinutes = game ? clamp(Math.round(target * 0.25), 8, Math.min(15, game.minutes + 4)) : 0;
  let budget = target - warmupMinutes - gameMinutes;

  const middle: PartDraft[] = [];
  const used = new Set<string>();
  if (ctx.ageGroup.ageMax <= 10) {
    const stationDrills = ranked("drill", (d) => d.iceArea === "station" || d.iceArea === "third");
    const count = budget >= 30 ? 4 : 3;
    const picked = stationDrills.slice(0, count).map((d) => d.id);
    if (picked.length >= 2) {
      const perStation = clamp(Math.floor(budget / picked.length), MIN_STATION_MINUTES, 8);
      middle.push({ type: "stations", minutesPerStation: perStation, drillIds: picked });
      picked.forEach((id) => used.add(id));
      budget -= perStation * picked.length;
    }
  }
  for (const d of ranked("drill")) {
    if (budget < 5 || middle.length >= 5) break;
    if (used.has(d.id)) continue;
    middle.push({ type: "drill", drillId: d.id, minutes: d.minutes });
    used.add(d.id);
    budget -= d.minutes;
  }

  const parts: PartDraft[] = [
    ...(warmup ? [{ type: "drill" as const, drillId: warmup.id, minutes: warmup.minutes }] : []),
    ...middle,
    ...(game ? [{ type: "drill" as const, drillId: game.id, minutes: gameMinutes }] : [])
  ];
  return { focus, parts: fitToMinutes(parts, target) };
}
