import type { ReactNode } from "react";
import { surfaceSize, unitOf, type Sketch, type SketchLine, type SketchMarker } from "../domain/sketch";
import { S } from "../i18n";
import { SPORT } from "../sport";
import { LineShape, MarkerShape, SurfaceMarkings } from "./SketchShapes";

export const SKETCH_PAD = 0.6;

/** Layers in drawing order: shooting zones under everything, symbols on top. */
export function SketchLayers({
  sketch,
  selectedId,
  upright,
  extra
}: {
  sketch: Sketch;
  selectedId?: string | null;
  upright?: number;
  extra?: ReactNode;
}) {
  const sport = SPORT.id;
  const u = unitOf(sport, sketch.surface);
  const { w, h } = surfaceSize(sport, sketch.surface);
  const marker = (m: SketchMarker) => (
    <MarkerShape
      key={m.id}
      m={m}
      u={u}
      sport={sport}
      selected={m.id === selectedId}
      upright={upright}
      coachLabel={S.ui.sketch.coachLabel}
    />
  );
  const line = (l: SketchLine) => <LineShape key={l.id} line={l} u={u} selected={l.id === selectedId} />;
  return (
    <>
      <SurfaceMarkings sport={sport} w={w} h={h} />
      {sketch.markers.filter((m) => m.kind === "zone").map(marker)}
      {sketch.lines.map(line)}
      {sketch.markers.filter((m) => m.kind !== "zone").map(marker)}
      {extra}
    </>
  );
}

/** Read-only drill sketch, full width. */
export function SketchView({ sketch, className }: { sketch: Sketch; className?: string }) {
  const { w, h } = surfaceSize(SPORT.id, sketch.surface);
  return (
    <svg
      className={`sketch${className ? ` ${className}` : ""}`}
      viewBox={`${-SKETCH_PAD} ${-SKETCH_PAD} ${w + 2 * SKETCH_PAD} ${h + 2 * SKETCH_PAD}`}
      role="img"
      aria-label={S.ui.editor.diagram}
    >
      <SketchLayers sketch={sketch} />
    </svg>
  );
}
