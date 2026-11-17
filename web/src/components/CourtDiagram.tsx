import type { Area } from "../domain/types";
import { S } from "../i18n";

// Schematic floorball court (40 × 20 m, 5 units per metre) with the part a
// drill needs shaded. "station" is a quarter court, 20 × 10 m.

const W = 200;
const H = 100;

const AREAS: Record<Area, { x: number; y: number; w: number; h: number }> = {
  full: { x: 0, y: 0, w: W, h: H },
  half: { x: 0, y: 0, w: W / 2, h: H },
  third: { x: 0, y: 0, w: 67, h: H },
  station: { x: 0, y: 0, w: W / 2, h: H / 2 }
};

/** Goal crease (4 × 5 m), keeper area and goal at one end; `flip` mirrors it. */
function End({ flip }: { flip?: boolean }) {
  const x = (v: number) => (flip ? W - v : v);
  const rect = (x0: number, w: number) => (flip ? W - x0 - w : x0);
  return (
    <>
      <rect x={rect(14, 20)} y={37.5} width={20} height={25} />
      <rect x={rect(17.5, 5)} y={43.75} width={5} height={12.5} />
      <line x1={x(17.5)} y1={46} x2={x(17.5)} y2={54} stroke="var(--ink)" strokeWidth="3" />
    </>
  );
}

export function CourtDiagram({ area, width = 120 }: { area: Area; width?: number }) {
  const a = AREAS[area];
  return (
    <svg
      className="rink"
      width={width}
      height={(width * H) / W}
      viewBox={`-3 -3 ${W + 6} ${H + 6}`}
      role="img"
      aria-label={S.iceAreas[area]}
    >
      <defs>
        <clipPath id={`court-clip-${area}`}>
          <rect x="0" y="0" width={W} height={H} rx="8" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="8" fill="var(--surface)" />
      <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="var(--area)" clipPath={`url(#court-clip-${area})`} />
      <g stroke="var(--faint)" strokeWidth="2" fill="none">
        <line x1={W / 2} y1="0" x2={W / 2} y2={H} />
        <circle cx={W / 2} cy={H / 2} r="1.5" fill="var(--faint)" />
        <End />
        <End flip />
      </g>
      <rect x="0" y="0" width={W} height={H} rx="8" fill="none" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  );
}
