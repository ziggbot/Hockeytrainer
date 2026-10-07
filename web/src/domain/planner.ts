import type { AgeGroup, Drill, PartDraft, SessionPart, SessionTemplate, Skill } from "./types";
import { ageOverlaps } from "./curriculum";

// "Plan practice" (spec §5.4): suggest a session that matches the team's
// current block, sized to the ice slot.

/** Every segment is a whole number of 5-minute blocks (club convention). */
export const STEP = 5;
export const MIN_PART_MINUTES = STEP;
export const MIN_STATION_MINUTES = STEP;
/** The club's standard rotation. */
export const STATION_COUNT = 4;
/** Every practice opens with these (club's base). */
export const WARMUP_MINUTES = 5;
export const GATHER_MINUTES = 5;
/** Every practice ends with a closing talk: 5 min, or 10 on long ice. */
export const CLOSING_MINUTES = 5;
export const LONG_PRACTICE_MINUTES = 75;
export const closingMinutes = (total: number) => (total >= LONG_PRACTICE_MINUTES ? 2 * STEP : CLOSING_MINUTES);
/** One station of every rotation is a plain game against small goals; it is the last one. */
export const MATCH_STATION_ID = "g-smallgoals";
/** Bumped when the planner's output shape changes; see store `refreshUntouchedPlans`. */
export const PLAN_VERSION = 4;

export const roundToStep = (m: number) => Math.max(STEP, Math.round(m / STEP) * STEP);

export function partMinutes(p: PartDraft | SessionPart): number {
  return p.type === "stations" ? p.minutesPerStation * p.drillIds.length : p.minutes;
}

export function totalMinutes(parts: (PartDraft | SessionPart)[]): number {
  return parts.reduce((sum, p) => sum + partMinutes(p), 0);
}

export function drillIdsOf(parts: (PartDraft | SessionPart)[]): string[] {
  return parts.flatMap((p) => (p.type === "drill" ? [p.drillId] : p.type === "stations" ? p.drillIds : []));
}

export interface Allocation {
  warmup: number;
  /** Gathering and splitting into station groups; 0 when there is no rotation. */
  gather: number;
  /** 0 when the slot is too short for a rotation. */
  perStation: number;
  /** Whole-group focus drills after the rotation, 10–20 min each. */
  extras: number[];
  /** 0 when there is no time left for a game. */
  game: number;
  closing: number;
}

/**
 * Split an ice slot into the club's base, all in 5-minute steps: warm-up 5,
 * gathering 5, rotation of 4 × 5 (or 4 × 10 from 60 min) and a closing talk
 * of 5 (10 from 75 min). What is left becomes a game up to 20 and
 * whole-group drills of 10–20 min; 5 minutes left over go to the warm-up.
 */
export function allocate(total: number, stations = STATION_COUNT): Allocation {
  const t = Math.floor(total / STEP) * STEP;
  const closing = closingMinutes(t);
  if (t < WARMUP_MINUTES + GATHER_MINUTES + STEP * stations + closing) {
    // Too short for a rotation: warm-up, a game and the closing talk.
    const warmup = Math.min(t, WARMUP_MINUTES);
    const end = Math.min(CLOSING_MINUTES, t - warmup);
    return { warmup, gather: 0, perStation: 0, extras: [], game: t - warmup - end, closing: end };
  }
  const perStation = t >= 60 ? 2 * STEP : STEP;
  let warmup = WARMUP_MINUTES;
  let left = t - warmup - GATHER_MINUTES - perStation * stations - closing;
  // Too short for a part of its own.
  if (left === STEP) {
    warmup += STEP;
    left = 0;
  }
  const base = { warmup, gather: GATHER_MINUTES, perStation, closing };
  if (left <= 20) return { ...base, extras: [], game: left };
  let game = 15;
  left -= game;
  if (left < 10) {
    game += left;
    left = 0;
  }
  const extras: number[] = [];
  while (left > 0) {
    let chunk = Math.min(20, left);
    if (left - chunk > 0 && left - chunk < 10) chunk = left - 10;
    extras.push(chunk);
    left -= chunk;
  }
  return { ...base, extras, game };
}

/** Which drills fill each slot of the standard shape. */
export interface Blueprint {
  warmup?: string;
  /** All stations of the rotation, match station included. */
  stations: string[];
  extras: string[];
  game?: string;
}

/** warm-up → gathering → stations (+ free zone) → whole-group drills → game → closing */
export function assemble(bp: Blueprint, minutes: number): PartDraft[] {
  const a = allocate(minutes, bp.stations.length || STATION_COUNT);
  const parts: PartDraft[] = [];
  if (bp.warmup && a.warmup > 0) parts.push({ type: "drill", drillId: bp.warmup, minutes: a.warmup });
  if (a.perStation > 0 && bp.stations.length >= 2) {
    parts.push({ type: "gather", minutes: a.gather });
    parts.push({ type: "stations", drillIds: bp.stations, minutesPerStation: a.perStation, freeZone: true });
  }
  a.extras.forEach((m, i) => {
    if (bp.extras[i]) parts.push({ type: "drill", drillId: bp.extras[i], minutes: m });
  });
  if (bp.game && a.game > 0) parts.push({ type: "drill", drillId: bp.game, minutes: a.game });
  if (a.closing > 0) parts.push({ type: "closing", minutes: a.closing });
  return parts;
}

const partStep = (p: PartDraft | SessionPart) => (p.type === "stations" ? p.minutesPerStation : p.minutes);

/**
 * Plans from the app's first version (and links made with it) can hold parts
 * like 42 or 7 minutes. Round every part to the 5-minute grid; if that leaves
 * the plan 5 minutes short, the warm-up gets them, and if it runs over the
 * slot, the longest parts give back 5 at a time. Plans already on the grid
 * are returned as they are.
 */
export function snapToSteps<T extends PartDraft | SessionPart>(parts: T[], slot: number): T[] {
  if (parts.every((p) => partStep(p) % STEP === 0)) return parts;
  const out = parts.map((p) =>
    p.type === "stations"
      ? { ...p, minutesPerStation: roundToStep(p.minutesPerStation) }
      : { ...p, minutes: roundToStep(p.minutes) }
  ) as T[];
  const target = Math.floor(slot / STEP) * STEP;
  const first = out[0];
  if (first?.type === "drill" && target - totalMinutes(out) >= STEP) out[0] = { ...first, minutes: first.minutes + STEP };
  while (totalMinutes(out) > target) {
    let longest = -1;
    out.forEach((p, i) => {
      if (p.type !== "stations" && p.minutes > STEP && (longest < 0 || p.minutes > partStep(out[longest]))) longest = i;
    });
    if (longest < 0) break;
    const p = out[longest];
    if (p.type !== "stations") out[longest] = { ...p, minutes: p.minutes - STEP };
  }
  return out;
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

export const templateDrillIds = (t: SessionTemplate) => [t.warmup, ...t.extras, ...t.stations, t.game];

/** The small-goal match for the last station, if the library has it. */
const matchStation = (drills: Drill[]) => (drills.some((d) => d.id === MATCH_STATION_ID) ? MATCH_STATION_ID : undefined);

/** Templates usable for this team, best match first. */
export function matchingTemplates(ctx: Pick<PlanContext, "ageGroup" | "focus" | "templates" | "drills">): SessionTemplate[] {
  const known = new Set(ctx.drills.map((d) => d.id));
  return (
    ctx.templates
      .filter((t) => t.ageGroupIds.includes(ctx.ageGroup.id))
      .filter((t) => templateDrillIds(t).every((id) => known.has(id)))
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

/** Drill candidates for each slot of the blueprint, focus skills first. */
function candidates(ctx: PlanContext, seed: number) {
  const focus = ctx.focus.length > 0 ? ctx.focus : ctx.targetSkills.slice(0, 2);
  const rand = mulberry32(hashString(`${ctx.ageGroup.id}|${focus.join(",")}|${seed}`));
  const usable = (slack: number) =>
    ctx.drills.filter(
      (d) => ageOverlaps(d, ctx.ageGroup, slack) && d.minPlayers <= ctx.playerCount && !d.skills.includes("goalie")
    );
  let pool = usable(0);
  if (pool.length < 12) pool = usable(2);

  const ranked = (filter: (d: Drill) => boolean, gameBonus = false) => {
    const scored = pool
      .filter(filter)
      .map((d) => ({
        d,
        onFocus: overlap(d.skills, focus) > 0,
        score:
          overlap(d.skills, focus) * 3 +
          overlap(d.skills, ctx.targetSkills) +
          // The closing game should be a real small-area game, not a relay.
          (gameBonus && d.skills.includes("gameSense") ? 4 : 0) +
          rand() * 1.5
      }))
      .sort((a, b) => b.score - a.score);
    const on = scored.filter((x) => x.onFocus).map((x) => x.d.id);
    const off = scored.filter((x) => !x.onFocus).map((x) => x.d.id);
    return [...rotate(on, seed), ...rotate(off, seed)];
  };

  return {
    focus,
    warmups: ranked((d) => d.kind === "warmup"),
    // A station is half an end zone, so only drills that fit one.
    stations: ranked((d) => d.kind !== "warmup" && (d.iceArea === "station" || d.iceArea === "third")),
    extras: ranked((d) => d.kind === "drill"),
    games: ranked((d) => d.kind === "game", true)
  };
}

const firstNotIn = (list: string[], used: Set<string>) => list.find((id) => !used.has(id));

/** Enough whole-group drills for the longest ice time (180 min). */
const MAX_EXTRAS = 6;

function takeDistinct(list: string[], count: number, used: Set<string>): string[] {
  const out: string[] = [];
  for (const id of list) {
    if (out.length === count) break;
    if (used.has(id)) continue;
    out.push(id);
    used.add(id);
  }
  return out;
}

export function suggestPlan(ctx: PlanContext): PlanSuggestion {
  const templates = matchingTemplates(ctx);
  if (ctx.variant < templates.length) {
    const t = templates[ctx.variant];
    const c = candidates(ctx, 0);
    const match = matchStation(ctx.drills);
    const used = new Set([...templateDrillIds(t), ...(match ? [match] : [])]);
    // Without the match drill, a library station takes its place.
    const stations = [...t.stations, ...(match ? [match] : takeDistinct(c.stations, 1, used))];
    // Long slots may need more whole-group drills than the template lists.
    const fill = takeDistinct(c.extras, MAX_EXTRAS, used);
    const bp: Blueprint = { warmup: t.warmup, stations, extras: [...t.extras, ...fill], game: t.game };
    return { title: t.title, focus: t.focus, parts: assemble(bp, ctx.minutes), templateId: t.id };
  }
  return generatePlan(ctx, ctx.variant - templates.length);
}

/**
 * Build a session from the drill library in the standard shape. Each `seed`
 * rotates the candidate lists so "Nytt förslag" gives a different plan.
 */
export function generatePlan(ctx: PlanContext, seed: number): PlanSuggestion {
  const c = candidates(ctx, seed);
  const match = matchStation(ctx.drills);
  const used = new Set<string>(match ? [match] : []);
  const warmup = firstNotIn(c.warmups, used);
  if (warmup) used.add(warmup);
  const skill = takeDistinct(c.stations, match ? STATION_COUNT - 1 : STATION_COUNT, used);
  const stations = match ? [...skill, match] : skill;
  const game = firstNotIn(c.games, used);
  if (game) used.add(game);
  const extras = takeDistinct(c.extras, MAX_EXTRAS, used);
  return { focus: c.focus, parts: assemble({ warmup, stations, extras, game }, ctx.minutes) };
}
