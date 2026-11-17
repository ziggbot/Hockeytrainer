import type { PartDraft, SessionPart } from "./types";
import { partMinutes } from "./planner";

// Rink mode runs on one clock for the whole practice: the coach starts it
// once and the current part (and station rotation) follows from elapsed time.
// Practices drift a few minutes either way; the coach just follows along.

export interface Segment {
  index: number;
  part: SessionPart | PartDraft;
  /** Minutes from the start of the practice. */
  start: number;
  minutes: number;
}

export function segmentsOf(parts: (SessionPart | PartDraft)[]): Segment[] {
  let start = 0;
  return parts.map((part, index) => {
    const seg = { index, part, start, minutes: partMinutes(part) };
    start += seg.minutes;
    return seg;
  });
}

export const totalOf = (segments: Segment[]) => segments.reduce((sum, s) => sum + s.minutes, 0);

export interface Position {
  /** Index of the running segment; -1 before start, segments.length when finished. */
  segment: number;
  /** Station rotation (0-based) when the running segment is a rotation. */
  rotation: number | null;
  /** Milliseconds left of the running segment, or of the rotation inside it. */
  leftMs: number;
  /** 0–1 through the whole practice. */
  progress: number;
}

const MIN = 60_000;

export function positionAt(segments: Segment[], elapsedMs: number | null): Position {
  const total = totalOf(segments) * MIN;
  if (elapsedMs === null || elapsedMs < 0) return { segment: -1, rotation: null, leftMs: 0, progress: 0 };
  if (elapsedMs >= total) return { segment: segments.length, rotation: null, leftMs: 0, progress: 1 };
  const seg = segments.find((s) => elapsedMs < (s.start + s.minutes) * MIN)!;
  const into = elapsedMs - seg.start * MIN;
  if (seg.part.type === "stations") {
    const per = seg.part.minutesPerStation * MIN;
    const rotation = Math.min(Math.floor(into / per), seg.part.drillIds.length - 1);
    return { segment: seg.index, rotation, leftMs: (rotation + 1) * per - into, progress: elapsedMs / total };
  }
  return { segment: seg.index, rotation: null, leftMs: seg.minutes * MIN - into, progress: elapsedMs / total };
}

/** Changes whenever a new part or station rotation begins — the moment to signal. */
export const boundaryKey = (p: Position) => `${p.segment}:${p.rotation ?? "-"}`;

/** Groups move A → B → C …: in rotation r, station s hosts group ((s − r) mod n) + 1. */
export const groupAt = (station: number, rotation: number, stations: number) =>
  ((((station - rotation) % stations) + stations) % stations) + 1;

/** "07:41" */
export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
