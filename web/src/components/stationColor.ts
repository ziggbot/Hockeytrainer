import type { CSSProperties } from "react";

/** Inline style giving a station element its colour (A red, B blue, …); see --st-* in global.css. */
export const stationStyle = (index: number): CSSProperties => ({ "--st": `var(--st-${index % 6})` }) as CSSProperties;
