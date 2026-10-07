import type { IceArea } from "../domain/types";
import { S } from "../i18n";

// Schematic rink (60 × 30 m, IIHF proportions, approximate) with the part
// of the ice a drill needs shaded yellow.

const W = 200;
const H = 100;

const AREAS: Record<IceArea, { x: number; y: number; w: number; h: number }> = {
  full: { x: 0, y: 0, w: W, h: H },
  half: { x: 0, y: 0, w: W / 2, h: H },
  third: { x: 0, y: 0, w: 76, h: H },
  station: { x: 0, y: 0, w: 76, h: H / 2 }
};

export function RinkDiagram({ area, width = 120 }: { area: IceArea; width?: number }) {
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
        <clipPath id={`rink-clip-${area}`}>
          <rect x="0" y="0" width={W} height={H} rx="28" />
        </clipPath>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="28" fill="var(--surface)" />
      <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="var(--area)" clipPath={`url(#rink-clip-${area})`} />
      <g stroke="var(--faint)" strokeWidth="2" fill="none">
        <line x1={W / 2} y1="0" x2={W / 2} y2={H} />
        <line x1="76" y1="0" x2="76" y2={H} />
        <line x1={W - 76} y1="0" x2={W - 76} y2={H} />
        <line x1="13" y1="8" x2="13" y2={H - 8} />
        <line x1={W - 13} y1="8" x2={W - 13} y2={H - 8} />
        <circle cx={W / 2} cy={H / 2} r="15" />
        <circle cx="40" cy="27" r="13" />
        <circle cx="40" cy="73" r="13" />
        <circle cx={W - 40} cy="27" r="13" />
        <circle cx={W - 40} cy="73" r="13" />
      </g>
      <rect x="0" y="0" width={W} height={H} rx="28" fill="none" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  );
}
