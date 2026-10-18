import { SPORT_ID } from "./id";
import type { SportPack } from "./types";
import { hockey } from "./hockey";
import { innebandy } from "./innebandy";

// The pack this build runs. Pass a pack explicitly in tests to cover the
// other sport.

export const SPORTS: Record<string, SportPack> = { hockey, innebandy };

export const SPORT: SportPack = SPORTS[SPORT_ID] ?? hockey;
