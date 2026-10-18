import type { AgeGroup, Area, Curriculum, Drill, EquipmentItem, SessionTemplate, Skill } from "../domain/types";
import type { SportId } from "./id";

// One sport = one pack: content, the lists the screens offer, the club's
// session shape and branding. Both apps share everything else (planner,
// live mode, store, share links). Swedish labels stay in i18n/sv.ts.

/** The club's base for every suggested practice, in minutes. */
export interface SessionShape {
  /** Base warm-up. 5 minutes left over go here while it is under 10. */
  warmup: number;
  /** Drill that opens every plan with 5 of the warm-up minutes (injury prevention). */
  prevention?: string;
  /** Gathering and splitting into station groups, before the rotation. */
  gather: number;
  /** The plain game that is always the last station of the rotation. */
  matchStationId: string;
  /** Open area for players who can't join the rotation (ice: the neutral zone). */
  freeZone: boolean;
  /** Drill areas that fit one station. */
  stationAreas: Area[];
}

export interface SportPack {
  id: SportId;
  /** localStorage prefix, so each app keeps its own data. */
  storagePrefix: string;
  /** Club crest in public/, shown top left (not in the claude.ai preview). */
  logo: string;
  /** Crest size in the header, px. */
  logoSize: [number, number];
  /** In display order. */
  skills: Skill[];
  areas: Area[];
  equipment: EquipmentItem[];
  /** The item a drill can need one of per player (pucks, balls). */
  perPlayerItem: EquipmentItem;
  ageGroups: AgeGroup[];
  defaultAgeGroupId: string;
  curricula: Curriculum[];
  drills: Drill[];
  templates: SessionTemplate[];
  shape: SessionShape;
}
