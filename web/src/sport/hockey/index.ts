import type { SportPack } from "../types";
import { AGE_GROUPS, SEED_CURRICULA } from "./curricula";
import { SEED_DRILLS } from "./drills";
import { SEED_TEMPLATES } from "./templates";

export const hockey: SportPack = {
  id: "hockey",
  storagePrefix: "hockeytrainer",
  logo: "/club-logo.png",
  skills: ["skating", "puckHandling", "passing", "shooting", "gameSense", "battles", "goalie"],
  areas: ["full", "half", "third", "station"],
  equipment: ["pucks", "cones", "pinnies", "smallNets", "goals", "tires", "sticksOnIce"],
  perPlayerItem: "pucks",
  ageGroups: AGE_GROUPS,
  defaultAgeGroupId: "u10",
  curricula: SEED_CURRICULA,
  drills: SEED_DRILLS,
  templates: SEED_TEMPLATES,
  // Club's base (Färjestad): 5 warm-up, 5 gathering, 4 stations where D is a
  // match against small goals, free zone in the neutral zone.
  shape: {
    warmup: 5,
    gather: 5,
    matchStationId: "g-smallgoals",
    freeZone: true,
    // A station is half an end zone, so drills that fit one.
    stationAreas: ["station", "third"]
  }
};
