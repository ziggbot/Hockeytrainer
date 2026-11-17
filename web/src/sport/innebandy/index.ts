import type { SportPack } from "../types";
import { LEVELS, SEED_CURRICULA } from "./curricula";
import { SEED_DRILLS } from "./drills";
import { SEED_TEMPLATES } from "./templates";

export const innebandy: SportPack = {
  id: "innebandy",
  storagePrefix: "innebandytranare",
  logo: "/club-logo-innebandy.png",
  logoSize: [44, 44],
  skills: ["movement", "ballControl", "passing", "shooting", "feints", "gameSense", "defence", "goalie"],
  areas: ["full", "half", "station"],
  equipment: ["balls", "cones", "pinnies", "smallNets", "goals", "boards", "ladder"],
  perPlayerItem: "balls",
  ageGroups: LEVELS,
  defaultAgeGroupId: "gron",
  curricula: SEED_CURRICULA,
  drills: SEED_DRILLS,
  templates: SEED_TEMPLATES,
  // Same base as the hockey club, adapted to a 40 × 20 hall: a 5-minute
  // injury-prevention start (neuromuscular warm-up cut injuries in floorball
  // studies) plus 5 minutes with the ball, gathering, and 4 quarter-court
  // stations where D is 3 v 3. No neutral zone, so no free zone.
  shape: {
    warmup: 10,
    prevention: "ib-w-legs",
    gather: 5,
    matchStationId: "ib-g-3v3",
    freeZone: false,
    stationAreas: ["station"]
  }
};
