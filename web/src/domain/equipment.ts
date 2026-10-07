import type { Drill, EquipmentItem, EquipmentNeed, SessionPart } from "./types";

// Equipment checklist (spec §5.5), generated from the drills in a session.
// Sequential parts reuse the same gear, so we take the max per item across
// parts. Stations in a rotation run at the same time, so their needs add up.

export const EQUIPMENT_ORDER: EquipmentItem[] = ["pucks", "cones", "pinnies", "smallNets", "goals", "tires", "sticksOnIce"];

export interface EquipmentLine {
  item: EquipmentItem;
  count: number;
}

function resolve(need: EquipmentNeed, playerCount: number): number {
  if (need.count === "perPlayer") return playerCount;
  if (need.count === "perPair") return Math.ceil(playerCount / 2);
  return need.count;
}

function needsOf(drill: Drill | undefined, playerCount: number): Map<EquipmentItem, number> {
  const out = new Map<EquipmentItem, number>();
  for (const need of drill?.equipment ?? []) {
    out.set(need.item, Math.max(out.get(need.item) ?? 0, resolve(need, playerCount)));
  }
  return out;
}

export function equipmentFor(parts: SessionPart[], drillsById: Map<string, Drill>, playerCount: number): EquipmentLine[] {
  const total = new Map<EquipmentItem, number>();
  for (const part of parts) {
    const partNeeds = new Map<EquipmentItem, number>();
    const ids = part.type === "drill" ? [part.drillId] : part.type === "stations" ? part.drillIds : [];
    // Stations: groups split the players, so per-player gear is shared
    // between stations — count it once for the whole team, not per station.
    const perStationPlayers = part.type === "stations" ? Math.ceil(playerCount / ids.length) : playerCount;
    for (const id of ids) {
      for (const [item, count] of needsOf(drillsById.get(id), perStationPlayers)) {
        partNeeds.set(item, (partNeeds.get(item) ?? 0) + count);
      }
    }
    for (const [item, count] of partNeeds) total.set(item, Math.max(total.get(item) ?? 0, count));
  }
  return EQUIPMENT_ORDER.filter((item) => total.has(item)).map((item) => ({ item, count: total.get(item)! }));
}
