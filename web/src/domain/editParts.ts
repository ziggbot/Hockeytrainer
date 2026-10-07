import type { SessionPart } from "./types";
import { MIN_PART_MINUTES, MIN_STATION_MINUTES } from "./planner";

// Pure edits on a session's running order (spec §5.4: swap, reorder, adjust
// minutes). Every function returns a new array.

export const MAX_STATIONS = 6;

export function movePart(parts: SessionPart[], index: number, dir: -1 | 1): SessionPart[] {
  const to = index + dir;
  if (to < 0 || to >= parts.length) return parts;
  const out = [...parts];
  [out[index], out[to]] = [out[to], out[index]];
  return out;
}

export function removePart(parts: SessionPart[], partId: string): SessionPart[] {
  return parts.filter((p) => p.id !== partId);
}

/** Minutes for a drill part, or minutes per station for a rotation. */
export function setPartMinutes(parts: SessionPart[], partId: string, minutes: number): SessionPart[] {
  return parts.map((p) => {
    if (p.id !== partId) return p;
    return p.type === "drill"
      ? { ...p, minutes: Math.max(MIN_PART_MINUTES, minutes) }
      : { ...p, minutesPerStation: Math.max(MIN_STATION_MINUTES, minutes) };
  });
}

/** Replace the drill in a part (or in one station of a rotation). */
export function swapDrill(parts: SessionPart[], partId: string, drillId: string, station?: number): SessionPart[] {
  return parts.map((p) => {
    if (p.id !== partId) return p;
    if (p.type === "drill") return { ...p, drillId };
    if (station === undefined) return p;
    return { ...p, drillIds: p.drillIds.map((id, i) => (i === station ? drillId : id)) };
  });
}

export function addStation(parts: SessionPart[], partId: string, drillId: string): SessionPart[] {
  return parts.map((p) =>
    p.id === partId && p.type === "stations" && p.drillIds.length < MAX_STATIONS
      ? { ...p, drillIds: [...p.drillIds, drillId] }
      : p
  );
}

/** Remove one station; a rotation left with a single station becomes a plain drill. */
export function removeStation(parts: SessionPart[], partId: string, station: number): SessionPart[] {
  return parts.map((p) => {
    if (p.id !== partId || p.type !== "stations") return p;
    const drillIds = p.drillIds.filter((_, i) => i !== station);
    if (drillIds.length === 1) return { id: p.id, type: "drill", drillId: drillIds[0], minutes: p.minutesPerStation };
    return { ...p, drillIds };
  });
}

export function toggleFreeZone(parts: SessionPart[], partId: string): SessionPart[] {
  return parts.map((p) => (p.id === partId && p.type === "stations" ? { ...p, freeZone: !p.freeZone } : p));
}

export const stationLetter = (i: number) => String.fromCharCode(65 + i);
