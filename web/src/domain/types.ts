// Core data model. Mirrors SPEC_hockey.md §4 so the same shapes can be
// mapped 1:1 to Postgres tables when the Supabase backend lands.
// No player personal data anywhere (spec §4, GDPR): only a player count.

export type Skill = "skating" | "puckHandling" | "passing" | "shooting" | "gameSense" | "battles" | "goalie";

export const SKILLS: Skill[] = ["skating", "puckHandling", "passing", "shooting", "gameSense", "battles", "goalie"];

/** Where on the ice a drill runs. "station" = fits one cross-ice station. */
export type IceArea = "full" | "half" | "third" | "station";

export const ICE_AREAS: IceArea[] = ["full", "half", "third", "station"];

/** Planner role of a drill: opener, skill work, or game form at the end. */
export type DrillKind = "warmup" | "drill" | "game";

export type EquipmentItem = "pucks" | "cones" | "pinnies" | "smallNets" | "tires" | "sticksOnIce" | "goals";

export interface EquipmentNeed {
  item: EquipmentItem;
  /** Fixed count, or one per player / per pair (resolved with the team's player count). */
  count: number | "perPlayer" | "perPair";
}

export interface Drill {
  id: string;
  title: string;
  description: string;
  coachingPoints: string[];
  skills: Skill[];
  kind: DrillKind;
  /** Player age range in years, inclusive. */
  ageMin: number;
  ageMax: number;
  /** Default duration in minutes. */
  minutes: number;
  iceArea: IceArea;
  minPlayers: number;
  equipment: EquipmentNeed[];
  /** Image URL or data URL. Uploaded image in the MVP (spec §5.3). */
  diagram?: string;
  visibility: "private" | "club" | "public";
  source: "seed" | "own";
}

export interface AgeGroup {
  id: string;
  name: string;
  ageMin: number;
  ageMax: number;
  /** Adapted game format notes, e.g. cross-ice 3v3. */
  gameFormat: string;
}

export interface SeasonBlock {
  id: string;
  name: string;
  /** ISO week numbers. A block may wrap the new year (startWeek > endWeek). */
  startWeek: number;
  endWeek: number;
  /** 1–2 focus skills (spec §4). */
  focus: Skill[];
}

export interface Curriculum {
  ageGroupId: string;
  philosophy: string;
  targetSkills: Skill[];
  blocks: SeasonBlock[];
}

/** One recurring weekly ice time. Stand-in until iCal import (spec §5.9). */
export interface TrainingTime {
  id: string;
  /** ISO weekday: 1 = Monday … 7 = Sunday. */
  weekday: number;
  /** Local time "HH:MM". */
  start: string;
  minutes: number;
}

export interface Team {
  id: string;
  name: string;
  ageGroupId: string;
  /** Typical number of skaters; drives "1 puck per player" counts. */
  playerCount: number;
  schedule: TrainingTime[];
}

export type SessionPart =
  | { id: string; type: "drill"; drillId: string; minutes: number }
  /** Everyone gathers, hears the plan and is split into station groups. */
  | { id: string; type: "gather"; minutes: number }
  /** Closing talk at the end: what went well, what we take to next time. */
  | { id: string; type: "closing"; minutes: number }
  | {
      id: string;
      type: "stations";
      /** Time at each station; every group visits every station. */
      minutesPerStation: number;
      drillIds: string[];
      /**
       * Open area in the neutral zone for players who can't join the rotation
       * this time. They stay there; it is not part of the rotation.
       */
      freeZone?: boolean;
    };

export interface Session {
  id: string;
  teamId: string;
  /** Local calendar date "YYYY-MM-DD". */
  date: string;
  /** Local time "HH:MM". */
  start: string;
  /** Length of the ice slot; the plan is validated against it. */
  minutes: number;
  title: string;
  /** Skills the session was planned around (for the season overview). */
  focus: Skill[];
  parts: SessionPart[];
  status: "planned" | "done";
  /** Equipment ticked off at the rink. */
  equipmentChecked: EquipmentItem[];
  templateId?: string;
  /** Which planner alternative this is; "Nytt förslag" increments it. */
  variant?: number;
  /** Planner generation that built this plan; older untouched plans are rebuilt. */
  planVersion?: number;
  createdAt: string;
  updatedAt: string;
}

export type NoteTag = "repeat" | "tooHard" | "tooEasy" | "workedWell";

export const NOTE_TAGS: NoteTag[] = ["workedWell", "repeat", "tooHard", "tooEasy"];

/** Append-only: notes are never edited, so they can sync as a queue later. */
export interface SessionNote {
  id: string;
  sessionId: string;
  text: string;
  tags: NoteTag[];
  createdAt: string;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** A session part before it gets an id (templates, planner output). */
export type PartDraft = DistributiveOmit<SessionPart, "id">;

/**
 * Curated session (spec §4 SessionTemplate) in the club's standard shape:
 * warm-up → gathering → 4-station rotation → whole-group drills → game →
 * closing.
 * Minutes come from the slot length (planner `allocate`), not from the
 * template.
 */
export interface SessionTemplate {
  id: string;
  title: string;
  ageGroupIds: string[];
  focus: Skill[];
  warmup: string;
  /** Used in order when the slot is long enough for whole-group drills. */
  extras: string[];
  /** The skill stations (3); the planner adds the small-goal match as the last one. */
  stations: string[];
  game: string;
}
