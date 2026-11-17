import { memo, useId } from "react";
import {
  arrowHead,
  densify,
  isStraight,
  offset,
  smooth,
  stopBars,
  ticks,
  toPath,
  wavy,
  type Pt,
  type SketchColor,
  type SketchLine,
  type SketchMarker
} from "../domain/sketch";
import type { SportId } from "../sport/id";

// SVG pieces for drill sketches. Everything is in metres; `u` is the symbol
// scale (1 on a full rink) so symbols look the same size on every surface.

export const INK: Record<SketchColor, string> = {
  red: "#d62828",
  blue: "#1d4ed8",
  yellow: "#e0a100",
  black: "#0b1f33"
};

// Rink markings are muted so the drawing stands out.
const MARK_RED = "#d9a0aa";
const MARK_BLUE = "#a3b6cf";
const CREASE = "#dcefff";
const NET = "#d62828";
const NET_FILL = "#fde4e4";

// ── Surfaces ───────────────────────────────────────────────────

function Net({ x, flip }: { x: number; flip?: boolean }) {
  // Opening on the goal line, frame curving back behind it.
  const d = flip ? -1 : 1;
  return (
    <path
      d={`M${x} 14.08 H${x - d * 0.7} Q${x - d * 1.15} 14.08 ${x - d * 1.15} 14.6 V15.4 Q${x - d * 1.15} 15.92 ${x - d * 0.7} 15.92 H${x}`}
      fill={NET_FILL}
      stroke={NET}
      strokeWidth={0.22}
      strokeLinejoin="round"
    />
  );
}

function FaceoffCircle({ cx, cy }: { cx: number; cy: number }) {
  const hash = [-1, 1].flatMap((sx) => [-1, 1].map((sy) => [sx, sy] as const));
  return (
    <g stroke={MARK_RED} strokeWidth={0.15} fill="none">
      <circle cx={cx} cy={cy} r={4.5} />
      {[-1, 1].map((sy) =>
        [-0.9, 0.9].map((dx) => <line key={`${sy}${dx}`} x1={cx + dx} y1={cy + sy * 4.5} x2={cx + dx} y2={cy + sy * 5.2} />)
      )}
      {hash.map(([sx, sy]) => (
        <path key={`${sx}${sy}`} d={`M${cx + sx * 1.3} ${cy + sy * 0.35} H${cx + sx * 0.45} V${cy + sy * 1}`} />
      ))}
      <circle cx={cx} cy={cy} r={0.35} fill={MARK_RED} stroke="none" />
    </g>
  );
}

const HockeyRink = memo(function HockeyRink({ w, clipId }: { w: number; clipId: string }) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <rect x={0} y={0} width={60} height={30} rx={8.5} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={60} height={30} rx={8.5} fill="#ffffff" />
      <g clipPath={`url(#${clipId})`}>
        <line x1={4} y1={0} x2={4} y2={30} stroke={MARK_RED} strokeWidth={0.15} />
        <line x1={56} y1={0} x2={56} y2={30} stroke={MARK_RED} strokeWidth={0.15} />
        <rect x={22.3} y={0} width={0.45} height={30} fill={MARK_BLUE} />
        <rect x={37.25} y={0} width={0.45} height={30} fill={MARK_BLUE} />
        <rect x={29.8} y={0} width={0.4} height={30} fill={MARK_RED} />
        <path d="M4 13.2 A1.8 1.8 0 0 1 4 16.8 Z" fill={CREASE} stroke={MARK_RED} strokeWidth={0.12} />
        <path d="M56 13.2 A1.8 1.8 0 0 0 56 16.8 Z" fill={CREASE} stroke={MARK_RED} strokeWidth={0.12} />
        <FaceoffCircle cx={10} cy={8} />
        <FaceoffCircle cx={10} cy={22} />
        <FaceoffCircle cx={50} cy={8} />
        <FaceoffCircle cx={50} cy={22} />
        <circle cx={30} cy={15} r={4.5} fill="none" stroke={MARK_BLUE} strokeWidth={0.15} />
        <circle cx={30} cy={15} r={0.3} fill={MARK_BLUE} />
        {[24, 36].map((x) => [8, 22].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={0.35} fill={MARK_RED} />))}
        <Net x={4} />
        <Net x={56} flip />
      </g>
      <rect x={0} y={0} width={60} height={30} rx={8.5} fill="none" stroke="var(--ink)" strokeWidth={0.35} />
      {w < 60 && <line x1={w} y1={0} x2={w} y2={30} stroke="var(--ink)" strokeWidth={0.35} />}
    </>
  );
});

const FloorballCourt = memo(function FloorballCourt({ w, h }: { w: number; h: number }) {
  const end = (flip: boolean) => {
    const x = (v: number) => (flip ? 40 - v : v);
    const left = (x0: number, width: number) => (flip ? 40 - x0 - width : x0);
    return (
      <g key={flip ? "r" : "l"}>
        <rect x={left(2.85, 4)} y={7.5} width={4} height={5} fill="none" stroke={MARK_RED} strokeWidth={0.1} />
        <rect x={left(3.5, 1)} y={8.75} width={1} height={2.5} fill={CREASE} stroke={MARK_RED} strokeWidth={0.08} />
        <path
          d={`M${x(3.5)} 9.2 H${x(2.85)} V10.8 H${x(3.5)}`}
          fill={NET_FILL}
          stroke={NET}
          strokeWidth={0.14}
          strokeLinejoin="round"
        />
      </g>
    );
  };
  return (
    <>
      <rect x={0} y={0} width={40} height={20} rx={1} fill="#ffffff" />
      <line x1={20} y1={0} x2={20} y2={20} stroke={MARK_RED} strokeWidth={0.1} />
      <circle cx={20} cy={10} r={0.2} fill={MARK_RED} />
      {end(false)}
      {end(true)}
      <rect x={0} y={0} width={40} height={20} rx={1} fill="none" stroke="var(--ink)" strokeWidth={0.22} />
      {w < 40 && <line x1={w} y1={0} x2={w} y2={h} stroke="var(--ink)" strokeWidth={0.22} />}
      {h < 20 && <line x1={0} y1={h} x2={w} y2={h} stroke="var(--ink)" strokeWidth={0.22} />}
    </>
  );
});

export function SurfaceMarkings({ sport, w, h }: { sport: SportId; w: number; h: number }) {
  // Unique per sketch: a clipPath shared by id stops working when the first
  // copy sits in a hidden element (e.g. a closed <details>).
  const clipId = `sk-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return sport === "innebandy" ? <FloorballCourt w={w} h={h} /> : <HockeyRink w={w} clipId={clipId} />;
}

// ── Lines ──────────────────────────────────────────────────────

/** The smoothed centre line of a stroke (straight for passes and shots). */
export function centreLine(line: SketchLine, u: number): Pt[] {
  return isStraight(line.kind) ? densify(line.points, 0.15 * u) : smooth(line.points, 0.15 * u);
}

/** Shorten the end of a path so a thick style doesn't poke through the arrowhead. */
function trimEnd(pts: Pt[], by: number): Pt[] {
  let left = by;
  const out = pts.slice();
  while (out.length > 2 && left > 0) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > left) {
      const t = (d - left) / d;
      out[out.length - 1] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      break;
    }
    out.pop();
    left -= d;
  }
  return out;
}

export const LineShape = memo(function LineShape({ line, u, selected }: { line: SketchLine; u: number; selected?: boolean }) {
  const base = centreLine(line, u);
  if (base.length < 2) return null;
  const color = INK[line.color];
  const sw = 0.22 * u;
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };
  const back = line.kind === "skateBack" || line.kind === "puckBack";
  const withPuck = line.kind === "puck" || line.kind === "puckBack";

  let body: JSX.Element;
  if (line.kind === "shot") {
    const trimmed = trimEnd(base, 0.6 * u);
    body = (
      <>
        <path d={toPath(offset(trimmed, 0.24 * u))} {...common} />
        <path d={toPath(offset(trimmed, -0.24 * u))} {...common} />
      </>
    );
  } else if (line.kind === "pass") {
    body = <path d={toPath(base)} {...common} strokeDasharray={`${0.75 * u} ${0.55 * u}`} strokeLinecap="butt" />;
  } else {
    const shape = withPuck ? wavy(base, 0.38 * u, 1.3 * u, 1.6 * u) : base;
    body = (
      <>
        <path d={toPath(shape)} {...common} />
        {back &&
          ticks(base, 1.5 * u, 0.5 * u, 1.8 * u).map(([a, b], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...common} />
          ))}
      </>
    );
  }

  let end: JSX.Element | null = null;
  if (line.end === "arrow") {
    const size = (line.kind === "shot" ? 1.25 : 0.95) * u;
    end = (
      <polyline
        points={arrowHead(base, size)
          .map((p) => p.join(","))
          .join(" ")}
        {...common}
      />
    );
  } else if (line.end === "stop") {
    end = (
      <>
        {stopBars(base, 0.75 * u, 0.45 * u).map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} {...common} strokeWidth={sw * 1.2} />
        ))}
      </>
    );
  }

  return (
    <g data-id={line.id} className="sk-item">
      {selected && (
        <path
          d={toPath(base)}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={0.25}
          strokeWidth={1.6 * u}
          strokeLinecap="round"
        />
      )}
      {/* Wide invisible stroke: easy to hit with a finger. */}
      <path d={toPath(base)} fill="none" stroke="transparent" strokeWidth={2.4 * u} className="sk-hit" />
      {body}
      {end}
    </g>
  );
});

// ── Markers ────────────────────────────────────────────────────

const PUCK_PILE: Pt[] = [
  [0, 0],
  [0.55, 0.15],
  [-0.5, 0.3],
  [0.15, 0.6],
  [-0.1, -0.5]
];

export const MarkerShape = memo(function MarkerShape({
  m,
  u,
  sport,
  selected,
  upright,
  coachLabel
}: {
  m: SketchMarker;
  u: number;
  sport: SportId;
  selected?: boolean;
  /** Counter-rotation (degrees) so labels stay readable on a turned canvas. */
  upright?: number;
  coachLabel: string;
}) {
  const color = INK[m.color];
  const ball = sport === "innebandy";
  const label = (text: string, size: number, fill: string) => (
    <text
      x={0}
      y={0}
      transform={upright ? `rotate(${upright})` : undefined}
      textAnchor="middle"
      dominantBaseline="central"
      fontFamily="var(--display)"
      fontWeight={700}
      fontSize={size}
      fill={fill}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      {text}
    </text>
  );

  let body: JSX.Element;
  let hitR = 1.6 * u;
  switch (m.kind) {
    case "player":
    case "coach": {
      const fill = m.kind === "coach" ? INK.black : color;
      const text = m.kind === "coach" ? coachLabel : (m.label ?? "");
      const textFill = m.kind === "player" && m.color === "yellow" ? INK.black : "#ffffff";
      body = (
        <>
          <circle r={1.25 * u} fill={fill} stroke="#ffffff" strokeWidth={0.18 * u} />
          {text && label(text, (text.length > 1 ? 1.05 : 1.45) * u, textFill)}
        </>
      );
      break;
    }
    case "puck":
      body = ball ? (
        <circle r={0.42 * u} fill="#ffffff" stroke={INK.black} strokeWidth={0.13 * u} />
      ) : (
        <circle r={0.38 * u} fill={INK.black} />
      );
      hitR = 1.2 * u;
      break;
    case "pucks":
      body = (
        <>
          {PUCK_PILE.map(([x, y], i) =>
            ball ? (
              <circle key={i} cx={x * u} cy={y * u} r={0.3 * u} fill="#ffffff" stroke={INK.black} strokeWidth={0.1 * u} />
            ) : (
              <circle key={i} cx={x * u} cy={y * u} r={0.26 * u} fill={INK.black} />
            )
          )}
        </>
      );
      hitR = 1.3 * u;
      break;
    case "cone":
      body = (
        <path
          transform={upright ? `rotate(${upright})` : undefined}
          d={`M0 ${-0.8 * u} L${0.7 * u} ${0.55 * u} H${-0.7 * u} Z`}
          fill="#f97316"
          stroke="#9a3412"
          strokeWidth={0.1 * u}
          strokeLinejoin="round"
        />
      );
      hitR = 1.3 * u;
      break;
    case "tire":
      body = <circle r={0.85 * u} fill="none" stroke={INK.black} strokeWidth={0.38 * u} />;
      break;
    case "net":
    case "smallNet": {
      const s = (m.kind === "net" ? 1 : 0.6) * u;
      // Opening faces +x at angle 0 (a net on the left goal line).
      body = (
        <g transform={`rotate(${m.angle ?? 0})`}>
          <path
            d={`M${0.55 * s} ${-0.95 * s} H${-0.15 * s} Q${-0.6 * s} ${-0.95 * s} ${-0.6 * s} ${-0.45 * s} V${0.45 * s} Q${-0.6 * s} ${0.95 * s} ${-0.15 * s} ${0.95 * s} H${0.55 * s}`}
            fill={NET_FILL}
            stroke={NET}
            strokeWidth={0.24 * s}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      );
      hitR = 1.5 * s;
      break;
    }
    case "obstacle":
      body = (
        <g transform={`rotate(${m.angle ?? 0})`}>
          <rect x={-1.3 * u} y={-0.2 * u} width={2.6 * u} height={0.4 * u} rx={0.2 * u} fill="#57534e" />
        </g>
      );
      break;
    case "zone": {
      const r = (1.5 + (m.size ?? 2)) * u;
      body = (
        <circle
          r={r}
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth={0.15 * u}
          strokeDasharray={`${0.5 * u} ${0.35 * u}`}
        />
      );
      hitR = r;
      break;
    }
    case "text":
      body = (
        <g style={{ paintOrder: "stroke" }}>
          <text
            x={0}
            y={0}
            transform={upright ? `rotate(${upright})` : undefined}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--display)"
            fontWeight={700}
            fontSize={1.5 * u}
            fill={color}
            stroke="#ffffff"
            strokeWidth={0.45 * u}
            strokeLinejoin="round"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {m.label}
          </text>
        </g>
      );
      hitR = Math.max(1.6, (m.label?.length ?? 1) * 0.45) * u;
      break;
  }

  return (
    <g data-id={m.id} className="sk-item" transform={`translate(${m.x} ${m.y})`}>
      {selected && (
        <circle
          r={hitR + 0.35 * u}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={0.22 * u}
          strokeDasharray={`${0.5 * u} ${0.35 * u}`}
        />
      )}
      <circle r={hitR} fill="transparent" className="sk-hit" />
      {body}
    </g>
  );
});
