import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare } from "./share";
import type { Drill, Session } from "./types";
import {
  arrowHead,
  cleanSketch,
  emptySketch,
  finishStroke,
  isEmptySketch,
  MAX_LINES,
  moveLine,
  offset,
  pathLength,
  simplify,
  smooth,
  stopBars,
  surfaceSize,
  ticks,
  unitOf,
  wavy,
  type Pt,
  type SketchLine
} from "./sketch";

const straight: Pt[] = [
  [0, 0],
  [10, 0]
];

describe("sketch geometry", () => {
  it("simplify keeps the corners of a hand-drawn L and drops the jitter", () => {
    const raw: Pt[] = [];
    for (let i = 0; i <= 20; i++) raw.push([i / 2, i % 3 === 1 ? 0.05 : 0]);
    for (let y = 0.5; y <= 10; y += 0.5) raw.push([10, y]);
    const out = simplify(raw, 0.25);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual([0, 0]);
    expect(out[1][0]).toBeCloseTo(10);
    expect(out[2]).toEqual([10, 10]);
  });

  it("smooth passes through the control points and is dense", () => {
    const ctrl: Pt[] = [
      [0, 0],
      [5, 5],
      [10, 0]
    ];
    const s = smooth(ctrl, 0.2);
    expect(s[0]).toEqual([0, 0]);
    expect(s[s.length - 1][0]).toBeCloseTo(10);
    expect(s.some((p) => Math.abs(p[0] - 5) < 1e-9 && Math.abs(p[1] - 5) < 1e-9)).toBe(true);
    for (let i = 1; i < s.length; i++) expect(Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1])).toBeLessThan(0.5);
  });

  it("wavy stays within the amplitude and ends on the path", () => {
    const base = smooth(straight, 0.1);
    const w = wavy(base, 0.4, 1.5, 1);
    expect(Math.max(...w.map((p) => Math.abs(p[1])))).toBeLessThanOrEqual(0.4 + 1e-9);
    expect(Math.max(...w.map((p) => Math.abs(p[1])))).toBeGreaterThan(0.3);
    expect(w[w.length - 1][1]).toBeCloseTo(0);
  });

  it("offset moves a straight line sideways", () => {
    const o = offset(straight, 0.3);
    expect(Math.abs(o[0][1])).toBeCloseTo(0.3);
    expect(Math.abs(o[1][1])).toBeCloseTo(0.3);
  });

  it("ticks are evenly spaced, cross the line and leave room for the arrow", () => {
    const t = ticks(smooth(straight, 0.1), 2, 0.4, 1.5);
    expect(t.length).toBe(4); // at 2, 4, 6, 8 m (10 m is inside the skipped end)
    for (const [a, b] of t) {
      expect(a[0]).toBeCloseTo(b[0]);
      expect(Math.abs(a[1] - b[1])).toBeCloseTo(0.8);
    }
  });

  it("arrowHead points along the end of the path", () => {
    const [l, tip, r] = arrowHead(straight, 1);
    expect(tip).toEqual([10, 0]);
    expect(l[0]).toBeCloseTo(9);
    expect(r[0]).toBeCloseTo(9);
    expect(l[1]).toBeCloseTo(-r[1]);
  });

  it("stopBars draws two bars across the end", () => {
    const bars = stopBars(straight, 0.6, 0.4);
    expect(bars).toHaveLength(2);
    expect(bars[0][0][0]).toBeCloseTo(10);
    expect(bars[1][0][0]).toBeCloseTo(9.6);
    expect(Math.abs(bars[0][0][1] - bars[0][1][1])).toBeCloseTo(1.2);
  });

  it("finishStroke makes passes straight and ignores taps", () => {
    const raw: Pt[] = [
      [1, 1],
      [3, 2],
      [6, 1]
    ];
    expect(finishStroke("pass", raw, 1)).toEqual([
      [1, 1],
      [6, 1]
    ]);
    expect(
      finishStroke(
        "skate",
        [
          [1, 1],
          [1.2, 1.1]
        ],
        1
      )
    ).toBeNull();
    const skate = finishStroke("skate", raw, 1)!;
    expect(skate[0]).toEqual([1, 1]);
    expect(pathLength(skate)).toBeGreaterThan(5);
  });

  it("moveLine keeps the whole line on the surface", () => {
    const line: SketchLine = {
      id: "a",
      kind: "skate",
      points: [
        [2, 2],
        [8, 4]
      ],
      color: "red",
      end: "arrow"
    };
    const moved = moveLine(line, 100, -100, 30, 30);
    expect(moved.points).toEqual([
      [24, 0],
      [30, 2]
    ]);
  });

  it("symbols keep their screen size on every surface", () => {
    expect(unitOf("hockey", "full")).toBe(1.25);
    expect(unitOf("hockey", "half")).toBe(0.625);
    expect(unitOf("innebandy", "full") / unitOf("innebandy", "half")).toBe(2);
    expect(surfaceSize("innebandy", "zone")).toEqual({ w: 20, h: 10 });
  });
});

describe("cleanSketch (untrusted input)", () => {
  it("round-trips a valid sketch", () => {
    const s = {
      v: 1 as const,
      surface: "full" as const,
      lines: [
        {
          id: "l1",
          kind: "puck" as const,
          points: [
            [1, 2],
            [20, 10]
          ] as Pt[],
          color: "blue" as const,
          end: "stop" as const
        }
      ],
      markers: [
        { id: "m1", kind: "player" as const, x: 5, y: 5, color: "red" as const, label: "F" },
        { id: "m2", kind: "net" as const, x: 4, y: 15, color: "red" as const, angle: 90 },
        { id: "m3", kind: "text" as const, x: 30, y: 2, color: "black" as const, label: "Start" }
      ]
    };
    expect(cleanSketch(JSON.parse(JSON.stringify(s)), "hockey")).toEqual(s);
  });

  it("drops junk, clamps to the surface and caps sizes", () => {
    const raw = {
      v: 1,
      surface: "half",
      lines: [
        {
          kind: "laser",
          points: [
            [0, 0],
            [1, 1]
          ]
        },
        {
          kind: "skate",
          points: [
            [-5, 50],
            ["x", 1],
            [10, 10]
          ],
          color: "pink",
          end: "boom"
        },
        ...Array.from({ length: 100 }, () => ({
          kind: "pass",
          points: [
            [0, 0],
            [5, 5]
          ]
        }))
      ],
      markers: [
        { kind: "player", x: 1, y: 1, label: "<script>" },
        { kind: "text", x: 1, y: 1, label: "   " },
        { kind: "zone", x: 99, y: 1, size: 99, angle: 47 },
        { kind: "player", x: "1", y: 1 }
      ]
    };
    const s = cleanSketch(raw, "hockey")!;
    expect(s.lines.length).toBe(MAX_LINES - 1);
    expect(s.lines[0]).toMatchObject({
      kind: "skate",
      points: [
        [0, 30],
        [10, 10]
      ],
      color: "black",
      end: "arrow"
    });
    expect(s.markers).toHaveLength(2);
    expect(s.markers[0].label).toBeUndefined();
    expect(s.markers[1]).toMatchObject({ kind: "zone", x: 30, size: 4, angle: 45 });
  });

  it("rejects non-sketches and empty sketches", () => {
    expect(cleanSketch(null, "hockey")).toBeUndefined();
    expect(cleanSketch({ v: 2 }, "hockey")).toBeUndefined();
    expect(cleanSketch(emptySketch(), "hockey")).toBeUndefined();
    expect(isEmptySketch(emptySketch())).toBe(true);
  });
});

describe("sketch in share links", () => {
  it("travels with the coach's own drill and is validated on the way in", () => {
    const sketch = {
      v: 1 as const,
      surface: "half" as const,
      lines: [
        {
          id: "l",
          kind: "pass" as const,
          points: [
            [3, 3],
            [12, 9]
          ] as Pt[],
          color: "black" as const,
          end: "arrow" as const
        }
      ],
      markers: [{ id: "p", kind: "player" as const, x: 3, y: 3, color: "red" as const, label: "F" }]
    };
    const own: Drill = {
      id: "own-s",
      title: "Ritad",
      description: "",
      coachingPoints: [],
      skills: ["passing"],
      kind: "drill",
      ageMin: 8,
      ageMax: 12,
      minutes: 10,
      iceArea: "half",
      minPlayers: 2,
      equipment: [],
      diagram: "data:image/jpeg;base64,AAAA",
      sketch,
      visibility: "private",
      source: "own"
    };
    const session: Session = {
      id: "s",
      teamId: "t",
      date: "2026-11-20",
      start: "17:00",
      minutes: 10,
      title: "",
      focus: [],
      parts: [{ id: "a", type: "drill", drillId: own.id, minutes: 10 }],
      status: "planned",
      equipmentChecked: [],
      createdAt: "",
      updatedAt: ""
    };
    const decoded = decodeShare(encodeShare(session, "U10", new Map([[own.id, own]])));
    expect(decoded?.drills[0].sketch).toEqual(sketch);
    expect(decoded?.drills[0].diagram).toBeUndefined();
  });
});
