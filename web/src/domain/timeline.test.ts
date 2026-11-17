import { describe, expect, it } from "vitest";
import { boundaryKey, formatClock, groupAt, positionAt, segmentsOf, totalOf } from "./timeline";
import type { PartDraft } from "./types";

const MIN = 60_000;
const parts: PartDraft[] = [
  { type: "drill", drillId: "w", minutes: 5 },
  { type: "stations", drillIds: ["a", "b", "c", "d"], minutesPerStation: 10, freeZone: true },
  { type: "drill", drillId: "g", minutes: 15 }
];
const segs = segmentsOf(parts);

describe("rink timeline", () => {
  it("lays parts out end to end", () => {
    expect(segs.map((s) => [s.start, s.minutes])).toEqual([
      [0, 5],
      [5, 40],
      [45, 15]
    ]);
    expect(totalOf(segs)).toBe(60);
  });

  it("is idle before start and finished after the last part", () => {
    expect(positionAt(segs, null).segment).toBe(-1);
    expect(positionAt(segs, 60 * MIN)).toMatchObject({ segment: 3, progress: 1 });
  });

  it("follows the clock through parts and station rotations", () => {
    expect(positionAt(segs, 2 * MIN)).toMatchObject({ segment: 0, rotation: null, leftMs: 3 * MIN });
    expect(positionAt(segs, 5 * MIN)).toMatchObject({ segment: 1, rotation: 0, leftMs: 10 * MIN });
    expect(positionAt(segs, 27 * MIN)).toMatchObject({ segment: 1, rotation: 2, leftMs: 8 * MIN });
    expect(positionAt(segs, 50 * MIN)).toMatchObject({ segment: 2, rotation: null, leftMs: 10 * MIN });
    expect(positionAt(segs, 30 * MIN).progress).toBeCloseTo(0.5);
  });

  it("signals once per new part or rotation", () => {
    const keys = [0, 4, 5, 14, 15, 44, 45].map((m) => boundaryKey(positionAt(segs, m * MIN)));
    expect(keys).toEqual(["0:-", "0:-", "1:0", "1:0", "1:1", "1:3", "2:-"]);
  });

  it("rotates groups A → B → C → D", () => {
    expect([0, 1, 2, 3].map((s) => groupAt(s, 0, 4))).toEqual([1, 2, 3, 4]);
    expect([0, 1, 2, 3].map((s) => groupAt(s, 1, 4))).toEqual([4, 1, 2, 3]);
  });

  it("formats the countdown", () => {
    expect(formatClock(461_000)).toBe("07:41");
    expect(formatClock(-5)).toBe("00:00");
  });
});
