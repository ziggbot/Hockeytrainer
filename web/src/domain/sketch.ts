// Drill sketch: a coach's own diagram of a drill on the rink (or the
// floorball court), drawn in the usual coaching notation:
//   skating ──▶   skating with puck ∿∿▶   backwards: ticks across the line
//   pass ─ ─ ▶    shot ══▶               stop: two bars across the end
// Pure geometry and validation; rendering lives in components/Sketch*.tsx.
// Coordinates are metres from the top-left corner of the drawn surface.

import type { SportId } from "../sport/id";

export type SketchSurface = "full" | "half" | "zone";
export const SKETCH_SURFACES: SketchSurface[] = ["full", "half", "zone"];

export type SketchColor = "red" | "blue" | "yellow" | "black";
export const SKETCH_COLORS: SketchColor[] = ["red", "blue", "yellow", "black"];

export type MarkerKind =
  "player" | "coach" | "puck" | "pucks" | "cone" | "tire" | "net" | "smallNet" | "obstacle" | "zone" | "text";
export const MARKER_KINDS: MarkerKind[] = [
  "player",
  "coach",
  "puck",
  "pucks",
  "cone",
  "tire",
  "net",
  "smallNet",
  "obstacle",
  "zone",
  "text"
];

export type LineKind = "skate" | "skateBack" | "puck" | "puckBack" | "pass" | "shot";
export const LINE_KINDS: LineKind[] = ["skate", "skateBack", "puck", "puckBack", "pass", "shot"];

export type LineEnd = "arrow" | "stop" | "none";
export const LINE_ENDS: LineEnd[] = ["arrow", "stop", "none"];

/** Labels a player marker can carry (empty = plain circle). */
export const PLAYER_LABELS = ["", "X", "O", "F", "B", "C", "MV", "1", "2", "3", "4", "5"];

export interface SketchMarker {
  id: string;
  kind: MarkerKind;
  x: number;
  y: number;
  color: SketchColor;
  /** Player letter, or the text of a text marker. */
  label?: string;
  /** Degrees, for nets and obstacles. */
  angle?: number;
  /** Size step for shooting zones (1–4). */
  size?: number;
}

export interface SketchLine {
  id: string;
  kind: LineKind;
  /** Simplified control points; the curve is smoothed when drawn. */
  points: Pt[];
  color: SketchColor;
  end: LineEnd;
}

export interface Sketch {
  v: 1;
  surface: SketchSurface;
  lines: SketchLine[];
  markers: SketchMarker[];
}

export type Pt = [number, number];

// Each sport draws its own surface: an IIHF-sized rink or a floorball court.
const SIZES: Record<SportId, Record<SketchSurface, { w: number; h: number }>> = {
  hockey: { full: { w: 60, h: 30 }, half: { w: 30, h: 30 }, zone: { w: 24, h: 30 } },
  // Floorball "zone" is a quarter court (a station, 20 × 10 m).
  innebandy: { full: { w: 40, h: 20 }, half: { w: 20, h: 20 }, zone: { w: 20, h: 10 } }
};

export function surfaceSize(sport: SportId, surface: SketchSurface): { w: number; h: number } {
  return SIZES[sport][surface];
}

/**
 * Symbol scale. Symbols keep the same size on screen whatever part of the
 * surface is shown: 1.25 on a full rink, 0.625 on a half rink. Sized so a
 * player is big enough to tap on a phone (about 3 m across on a full rink,
 * like printed drill diagrams).
 */
export function unitOf(sport: SportId, surface: SketchSurface): number {
  return surfaceSize(sport, surface).w / 48;
}

export function emptySketch(surface: SketchSurface = "half"): Sketch {
  return { v: 1, surface, lines: [], markers: [] };
}

export const isEmptySketch = (s: Sketch | undefined): boolean => !s || (s.lines.length === 0 && s.markers.length === 0);

/** Passes and shots are straight; skating lines follow the finger. */
export const isStraight = (kind: LineKind): boolean => kind === "pass" || kind === "shot";

// ── Geometry ───────────────────────────────────────────────────

const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return len;
}

function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

/** Ramer–Douglas–Peucker: drop points that sit within `eps` of the line. */
export function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts.slice();
  let maxD = 0;
  let index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segmentDistance(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) {
      maxD = d;
      index = i;
    }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  const left = simplify(pts.slice(0, index + 1), eps);
  const right = simplify(pts.slice(index), eps);
  return [...left.slice(0, -1), ...right];
}

/**
 * Smooth curve through the control points (Catmull–Rom), returned as a dense
 * polyline with roughly `step` metres between points.
 */
export function smooth(pts: Pt[], step: number): Pt[] {
  if (pts.length < 3) return densify(pts, step);
  const out: Pt[] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const n = Math.max(1, Math.ceil(dist(p1, p2) / step));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const c = (a: number, b: number, cc: number, d: number) =>
        0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
}

/** Straight segments split so that no piece is longer than `step`. */
export function densify(pts: Pt[], step: number): Pt[] {
  if (pts.length < 2) return pts.slice();
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

/** Unit direction of travel at the end of the path (looks back a short way for a stable heading). */
export function endDirection(pts: Pt[], lookBack: number): Pt {
  const end = pts[pts.length - 1];
  for (let i = pts.length - 2; i >= 0; i--) {
    if (dist(pts[i], end) >= lookBack || i === 0) {
      const d = dist(pts[i], end) || 1;
      return [(end[0] - pts[i][0]) / d, (end[1] - pts[i][1]) / d];
    }
  }
  return [1, 0];
}

/** Point and unit normal at each sample, with distance along the path. */
function frames(pts: Pt[]): { p: Pt; n: Pt; s: number }[] {
  const out: { p: Pt; n: Pt; s: number }[] = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) s += dist(pts[i - 1], pts[i]);
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const d = dist(a, b) || 1;
    out.push({ p: pts[i], n: [-(b[1] - a[1]) / d, (b[0] - a[0]) / d], s });
  }
  return out;
}

/**
 * Wavy line (skating with the puck): a sine wave along the path. The last
 * `tail` metres run straight so the arrowhead sits cleanly.
 */
export function wavy(pts: Pt[], amplitude: number, wavelength: number, tail: number): Pt[] {
  const fr = frames(pts);
  const total = fr.length ? fr[fr.length - 1].s : 0;
  return fr.map(({ p, n, s }) => {
    const fade = Math.max(0, Math.min(1, (total - s) / Math.max(tail, 1e-6)));
    const off = amplitude * Math.sin((2 * Math.PI * s) / wavelength) * Math.min(1, fade);
    return [p[0] + n[0] * off, p[1] + n[1] * off];
  });
}

/** The path moved sideways by `d` (for the shot's double line). */
export function offset(pts: Pt[], d: number): Pt[] {
  return frames(pts).map(({ p, n }) => [p[0] + n[0] * d, p[1] + n[1] * d]);
}

/** Short bars across the path every `spacing` metres (backwards skating). */
export function ticks(pts: Pt[], spacing: number, half: number, skipEnd: number): [Pt, Pt][] {
  const fr = frames(pts);
  const total = fr.length ? fr[fr.length - 1].s : 0;
  const out: [Pt, Pt][] = [];
  let next = spacing;
  for (const { p, n, s } of fr) {
    if (s >= next && s <= total - skipEnd) {
      out.push([
        [p[0] - n[0] * half, p[1] - n[1] * half],
        [p[0] + n[0] * half, p[1] + n[1] * half]
      ]);
      next += spacing;
    }
  }
  return out;
}

/** Open arrowhead ">" at the end of the path: [left wing, tip, right wing]. */
export function arrowHead(pts: Pt[], size: number): [Pt, Pt, Pt] {
  const tip = pts[pts.length - 1];
  const [dx, dy] = endDirection(pts, size);
  const back: Pt = [tip[0] - dx * size, tip[1] - dy * size];
  const w = size * 0.6;
  return [[back[0] - dy * w, back[1] + dx * w], tip, [back[0] + dy * w, back[1] - dx * w]];
}

/** Stop: two short bars across the end of the path. */
export function stopBars(pts: Pt[], half: number, gap: number): [Pt, Pt][] {
  const tip = pts[pts.length - 1];
  const [dx, dy] = endDirection(pts, gap * 2);
  return [0, gap].map((back) => {
    const c: Pt = [tip[0] - dx * back, tip[1] - dy * back];
    return [
      [c[0] - dy * half, c[1] + dx * half],
      [c[0] + dy * half, c[1] - dx * half]
    ];
  });
}

export const toPath = (pts: Pt[]): string =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");

/** Control points for a finished stroke: straight for passes/shots, simplified otherwise. */
export function finishStroke(kind: LineKind, raw: Pt[], unit: number): Pt[] | null {
  if (raw.length < 2 || pathLength(raw) < 1.2 * unit) return null;
  if (isStraight(kind)) return [raw[0], raw[raw.length - 1]];
  return simplify(raw, 0.25 * unit).map(([x, y]) => [round1(x), round1(y)]);
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Everything in a sketch moved by (dx, dy), kept on the surface. */
export function moveLine(line: SketchLine, dx: number, dy: number, w: number, h: number): SketchLine {
  const xs = line.points.map((p) => p[0]);
  const ys = line.points.map((p) => p[1]);
  const mx = clamp(dx, -Math.min(...xs), w - Math.max(...xs));
  const my = clamp(dy, -Math.min(...ys), h - Math.max(...ys));
  return { ...line, points: line.points.map(([x, y]) => [round1(x + mx), round1(y + my)]) };
}

// ── Validation ─────────────────────────────────────────────────

export const MAX_LINES = 60;
export const MAX_MARKERS = 80;
export const MAX_POINTS = 120;
export const MAX_TEXT = 24;

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Saved data, backups and share links are untrusted: rebuild the sketch
 * field by field, clamp everything onto the surface and cap the sizes.
 * Returns undefined when nothing usable is left.
 */
export function cleanSketch(raw: unknown, sport: SportId): Sketch | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return undefined;
  const surface = oneOf(o.surface, SKETCH_SURFACES) ?? "half";
  const { w, h } = surfaceSize(sport, surface);
  const cx = (v: number) => round1(clamp(v, 0, w));
  const cy = (v: number) => round1(clamp(v, 0, h));
  const id = (v: unknown, i: number) => (typeof v === "string" && v.length > 0 ? v.slice(0, 40) : `i${i}`);

  const lines: SketchLine[] = (Array.isArray(o.lines) ? o.lines : [])
    .slice(0, MAX_LINES)
    .map((l, i): SketchLine | null => {
      const x = l as Record<string, unknown> | null;
      const kind = oneOf(x?.kind, LINE_KINDS);
      if (!x || !kind || !Array.isArray(x.points)) return null;
      const points = x.points
        .slice(0, MAX_POINTS)
        .filter((p): p is [number, number] => Array.isArray(p) && finite(p[0]) && finite(p[1]))
        .map(([px, py]): Pt => [cx(px), cy(py)]);
      if (points.length < 2) return null;
      return {
        id: id(x.id, i),
        kind,
        points,
        color: oneOf(x.color, SKETCH_COLORS) ?? "black",
        end: oneOf(x.end, LINE_ENDS) ?? "arrow"
      };
    })
    .filter((l): l is SketchLine => !!l);

  const markers: SketchMarker[] = (Array.isArray(o.markers) ? o.markers : [])
    .slice(0, MAX_MARKERS)
    .map((m, i): SketchMarker | null => {
      const x = m as Record<string, unknown> | null;
      const kind = oneOf(x?.kind, MARKER_KINDS);
      if (!x || !kind || !finite(x.x) || !finite(x.y)) return null;
      const marker: SketchMarker = {
        id: id(x.id, i),
        kind,
        x: cx(x.x),
        y: cy(x.y),
        color: oneOf(x.color, SKETCH_COLORS) ?? "black"
      };
      if (kind === "player") {
        const label = oneOf(x.label, PLAYER_LABELS);
        if (label) marker.label = label;
      }
      if (kind === "text") {
        const text = typeof x.label === "string" ? x.label.trim().slice(0, MAX_TEXT) : "";
        if (!text) return null;
        marker.label = text;
      }
      if (finite(x.angle)) marker.angle = (((Math.round(x.angle / 15) * 15) % 360) + 360) % 360;
      if (finite(x.size)) marker.size = clamp(Math.round(x.size), 1, 4);
      return marker;
    })
    .filter((m): m is SketchMarker => !!m);

  if (lines.length === 0 && markers.length === 0) return undefined;
  return { v: 1, surface, lines, markers };
}
