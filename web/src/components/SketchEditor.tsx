import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  clamp,
  emptySketch,
  finishStroke,
  isEmptySketch,
  isStraight,
  moveLine,
  PLAYER_LABELS,
  round1,
  SKETCH_COLORS,
  SKETCH_SURFACES,
  surfaceSize,
  unitOf,
  LINE_ENDS,
  MAX_LINES,
  MAX_MARKERS,
  MAX_TEXT,
  type LineKind,
  type MarkerKind,
  type Pt,
  type Sketch,
  type SketchColor,
  type SketchLine,
  type SketchMarker,
  type SketchSurface
} from "../domain/sketch";
import { S } from "../i18n";
import { SPORT } from "../sport";
import { newId } from "../store/store";
import { ConfirmButton } from "./ConfirmButton";
import { INK, LineShape, MarkerShape } from "./SketchShapes";
import { SKETCH_PAD, SketchLayers } from "./SketchView";

const t = S.ui.sketch;

type Tool = { t: "select" } | { t: "line"; kind: LineKind } | { t: "marker"; kind: MarkerKind; label?: string };

const LINE_TOOLS: LineKind[] = ["skate", "skateBack", "puck", "puckBack", "pass", "shot"];
const MARKER_TOOLS: { kind: MarkerKind; label?: string; name: string }[] = [
  { kind: "player", name: t.markers.player },
  { kind: "player", label: "MV", name: t.goalie },
  { kind: "coach", name: t.markers.coach },
  { kind: "puck", name: t.markers.puck },
  { kind: "pucks", name: t.markers.pucks },
  { kind: "cone", name: t.markers.cone },
  ...(SPORT.id === "hockey" ? [{ kind: "tire" as const, name: t.markers.tire }] : []),
  { kind: "net", name: t.markers.net },
  { kind: "smallNet", name: t.markers.smallNet },
  { kind: "obstacle", name: t.markers.obstacle },
  { kind: "zone", name: t.markers.zone },
  { kind: "text", name: t.markers.text }
];

interface History {
  past: Sketch[];
  present: Sketch;
  future: Sketch[];
}

type Drag =
  | { kind: "stroke"; pointerId: number }
  | { kind: "move"; pointerId: number; id: string; start: Pt; orig: SketchMarker | SketchLine; started: boolean };

const sameTool = (a: Tool, b: Tool) =>
  a.t === b.t &&
  (a.t === "select" || (a as { kind: string }).kind === (b as { kind: string }).kind) &&
  (a as { label?: string }).label === (b as { label?: string }).label;

/** Small preview of a tool for the palette. */
function ToolIcon({ tool }: { tool: Tool }) {
  if (tool.t === "select") {
    return (
      <svg viewBox="0 0 24 24" className="sk-tool__icon" aria-hidden="true">
        <path
          d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (tool.t === "line") {
    const line: SketchLine = {
      id: "icon",
      kind: tool.kind,
      points: isStraight(tool.kind)
        ? [
            [0.5, 2],
            [9.5, 2]
          ]
        : [
            [0.5, 2.8],
            [5, 1.2],
            [9.5, 2]
          ],
      color: "black",
      end: "arrow"
    };
    return (
      <svg viewBox="0 0 10 4" className="sk-tool__icon sk-tool__icon--wide" aria-hidden="true">
        <LineShape line={line} u={0.62} />
      </svg>
    );
  }
  const m: SketchMarker = {
    id: "icon",
    kind: tool.kind,
    x: 0,
    y: 0,
    color: tool.kind === "zone" ? "blue" : "red",
    label: tool.kind === "text" ? "Aa" : tool.label
  };
  return (
    <svg viewBox="-2 -2 4 4" className="sk-tool__icon" aria-hidden="true">
      <MarkerShape m={m} u={tool.kind === "zone" ? 0.55 : 1} sport={SPORT.id} coachLabel={t.coachLabel} />
    </svg>
  );
}

/**
 * Full-screen drawing surface for a drill. Tap to place symbols, drag to
 * draw skating lines; "Flytta" selects and moves. Turns the full rink
 * upright on a phone held in portrait so there is more room to draw.
 */
export function SketchEditor({
  initial,
  onDone,
  onCancel
}: {
  initial?: Sketch;
  onDone: (sketch: Sketch | undefined) => void;
  onCancel: () => void;
}) {
  const sport = SPORT.id;
  const [hist, setHist] = useState<History>(() => ({ past: [], present: initial ?? emptySketch("half"), future: [] }));
  const sketch = hist.present;
  const { w, h } = surfaceSize(sport, sketch.surface);
  const u = unitOf(sport, sketch.surface);

  const [tool, setTool] = useState<Tool>(() =>
    initial && !isEmptySketch(initial) ? { t: "select" } : { t: "marker", kind: "player" }
  );
  const [color, setColor] = useState<SketchColor>("red");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Pt[] | null>(null);
  const draftRef = useRef<Pt[]>([]);
  const drag = useRef<Drag | null>(null);
  const gRef = useRef<SVGGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);

  const rotated = sketch.surface === "full" && portrait;

  // ── History ──
  const commit = useCallback((next: Sketch) => {
    setHist((hs) => ({ past: [...hs.past, hs.present].slice(-100), present: next, future: [] }));
  }, []);
  const undo = useCallback(() => {
    setHist((hs) =>
      hs.past.length
        ? { past: hs.past.slice(0, -1), present: hs.past[hs.past.length - 1], future: [hs.present, ...hs.future] }
        : hs
    );
    setSelectedId(null);
  }, []);
  const redo = useCallback(() => {
    setHist((hs) =>
      hs.future.length ? { past: [...hs.past, hs.present], present: hs.future[0], future: hs.future.slice(1) } : hs
    );
    setSelectedId(null);
  }, []);

  const selectedMarker = sketch.markers.find((m) => m.id === selectedId);
  const selectedLine = sketch.lines.find((l) => l.id === selectedId);

  const updateMarker = (id: string, patch: Partial<SketchMarker>) =>
    commit({ ...sketch, markers: sketch.markers.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const updateLine = (id: string, patch: Partial<SketchLine>) =>
    commit({ ...sketch, lines: sketch.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setHist((hs) => ({
      past: [...hs.past, hs.present].slice(-100),
      present: {
        ...hs.present,
        lines: hs.present.lines.filter((l) => l.id !== selectedId),
        markers: hs.present.markers.filter((m) => m.id !== selectedId)
      },
      future: []
    }));
    setSelectedId(null);
  }, [selectedId]);

  // ── Layout: turn the full rink upright in a tall box ──
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setPortrait(el.clientHeight > el.clientWidth * 1.15);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lock page scroll behind the editor, like the bottom sheet does.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea");
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        removeSelected();
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, removeSelected]);

  // ── Pointer input ──
  const toPt = (e: ReactPointerEvent): Pt => {
    const m = gRef.current?.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return [clamp(p.x, 0, w), clamp(p.y, 0, h)];
  };

  const newMarker = (kind: MarkerKind, p: Pt, label?: string): SketchMarker => {
    const m: SketchMarker = { id: newId(), kind, x: round1(p[0]), y: round1(p[1]), color };
    if (kind === "player" && label) m.label = label;
    if (kind === "text") m.label = t.textDefault;
    if (kind === "net" || kind === "smallNet") m.angle = p[0] > w / 2 ? 180 : 0;
    if (kind === "zone") m.size = 2;
    return m;
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPt(e);
    if (tool.t === "line") {
      if (sketch.lines.length >= MAX_LINES) return;
      drag.current = { kind: "stroke", pointerId: e.pointerId };
      draftRef.current = [p];
      setDraft([p]);
      setSelectedId(null);
      return;
    }
    if (tool.t === "marker") {
      if (sketch.markers.length >= MAX_MARKERS) return;
      const m = newMarker(tool.kind, p, tool.label);
      commit({ ...sketch, markers: [...sketch.markers, m] });
      setSelectedId(m.id);
      // Keep the finger down to slide the new symbol into place.
      drag.current = { kind: "move", pointerId: e.pointerId, id: m.id, start: p, orig: m, started: true };
      return;
    }
    const id = (e.target as Element).closest("[data-id]")?.getAttribute("data-id") ?? null;
    const item: SketchMarker | SketchLine | undefined =
      sketch.markers.find((m) => m.id === id) ?? sketch.lines.find((l) => l.id === id);
    setSelectedId(item ? item.id : null);
    if (item) drag.current = { kind: "move", pointerId: e.pointerId, id: item.id, start: p, orig: item, started: false };
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const p = toPt(e);
    if (d.kind === "stroke") {
      const pts = draftRef.current;
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.15 * u) {
        draftRef.current = [...pts, p];
        setDraft(draftRef.current);
      }
      return;
    }
    const dx = p[0] - d.start[0];
    const dy = p[1] - d.start[1];
    if (!d.started) {
      if (Math.hypot(dx, dy) < 0.4 * u) return;
      d.started = true;
      setHist((hs) => ({ past: [...hs.past, hs.present].slice(-100), present: hs.present, future: [] }));
    }
    const o = d.orig;
    setHist((hs) => ({
      ...hs,
      present:
        "points" in o
          ? { ...hs.present, lines: hs.present.lines.map((l) => (l.id === o.id ? moveLine(o, dx, dy, w, h) : l)) }
          : {
              ...hs.present,
              markers: hs.present.markers.map((m) =>
                m.id === o.id ? { ...m, x: round1(clamp(o.x + dx, 0, w)), y: round1(clamp(o.y + dy, 0, h)) } : m
              )
            }
    }));
  };

  const endPointer = (e: ReactPointerEvent<SVGSVGElement>, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    if (d.kind !== "stroke" || tool.t !== "line") return;
    const raw = draftRef.current;
    draftRef.current = [];
    setDraft(null);
    if (cancelled) return;
    const points = finishStroke(tool.kind, raw, u);
    if (!points) return;
    const line: SketchLine = {
      id: newId(),
      kind: tool.kind,
      points,
      color: tool.kind === "pass" || tool.kind === "shot" ? (color === "yellow" ? "black" : color) : color,
      end: "arrow"
    };
    commit({ ...sketch, lines: [...sketch.lines, line] });
    setSelectedId(line.id);
  };

  // ── Surface switch keeps what fits (Ångra brings the rest back) ──
  const setSurface = (surface: SketchSurface) => {
    if (surface === sketch.surface) return;
    const next = surfaceSize(sport, surface);
    commit({
      ...sketch,
      surface,
      markers: sketch.markers.map((m) => ({ ...m, x: Math.min(m.x, next.w), y: Math.min(m.y, next.h) })),
      lines: sketch.lines.map((l) => ({
        ...l,
        points: l.points.map(([x, y]): Pt => [Math.min(x, next.w), Math.min(y, next.h)])
      }))
    });
    setSelectedId(null);
  };

  const pickColor = (c: SketchColor) => {
    setColor(c);
    if (selectedMarker) updateMarker(selectedMarker.id, { color: c });
    if (selectedLine) updateLine(selectedLine.id, { color: c });
  };

  const pickTool = (next: Tool) => {
    setTool(next);
    if (next.t !== "select") setSelectedId(null);
  };

  const viewW = (rotated ? h : w) + 2 * SKETCH_PAD;
  const viewH = (rotated ? w : h) + 2 * SKETCH_PAD;
  const draftLine: SketchLine | null =
    draft && draft.length > 1 && tool.t === "line"
      ? {
          id: "draft",
          kind: tool.kind,
          points: isStraight(tool.kind) ? [draft[0], draft[draft.length - 1]] : draft,
          color,
          end: "arrow"
        }
      : null;

  const toolButton = (tl: Tool, name: string, key: string) => (
    <button
      key={key}
      type="button"
      className={`sk-tool${sameTool(tool, tl) ? " sk-tool--on" : ""}`}
      aria-pressed={sameTool(tool, tl)}
      onClick={() => pickTool(tl)}
    >
      <ToolIcon tool={tl} />
      <span className="sk-tool__label">{name}</span>
    </button>
  );

  return (
    <div className="sk-editor" role="dialog" aria-modal="true" aria-label={t.title}>
      <header className="sk-head">
        <button type="button" className="btn" onClick={onCancel}>
          {t.cancel}
        </button>
        <div className="sk-seg">
          <button type="button" className="btn btn--icon" onClick={undo} disabled={!hist.past.length} aria-label={t.undo}>
            ↶
          </button>
          <button type="button" className="btn btn--icon" onClick={redo} disabled={!hist.future.length} aria-label={t.redo}>
            ↷
          </button>
        </div>
        <button type="button" className="btn btn--go" onClick={() => onDone(isEmptySketch(sketch) ? undefined : sketch)}>
          {t.done}
        </button>
      </header>

      <div className="sk-bar">
        <div className="sk-seg" role="group">
          {SKETCH_SURFACES.map((s) => (
            <button
              key={s}
              type="button"
              className={`chip chip--sm${sketch.surface === s ? " chip--on" : ""}`}
              aria-pressed={sketch.surface === s}
              onClick={() => setSurface(s)}
            >
              {t.surfaces[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="sk-canvas" ref={boxRef}>
        <svg
          className={`sk-svg${tool.t === "select" ? " sk-svg--select" : ""}`}
          viewBox={`${-SKETCH_PAD} ${-SKETCH_PAD} ${viewW} ${viewH}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label={t.canvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endPointer(e, false)}
          onPointerCancel={(e) => endPointer(e, true)}
        >
          <g ref={gRef} transform={rotated ? `translate(${h} 0) rotate(90)` : undefined}>
            <SketchLayers
              sketch={sketch}
              selectedId={selectedId}
              upright={rotated ? -90 : undefined}
              extra={draftLine && <LineShape line={draftLine} u={u} />}
            />
          </g>
        </svg>
      </div>

      {(selectedMarker || selectedLine) && (
        <div className="sk-props">
          {selectedMarker?.kind === "player" &&
            PLAYER_LABELS.map((l) => (
              <button
                key={l || "none"}
                type="button"
                className={`chip chip--sm sk-label${(selectedMarker.label ?? "") === l ? " chip--on" : ""}`}
                onClick={() => updateMarker(selectedMarker.id, { label: l || undefined })}
              >
                {l || t.noLabel}
              </button>
            ))}
          {selectedMarker?.kind === "text" && (
            <input
              className="input sk-text"
              value={selectedMarker.label ?? ""}
              maxLength={MAX_TEXT}
              aria-label={t.textLabel}
              onChange={(e) =>
                setHist((hs) => ({
                  ...hs,
                  present: {
                    ...hs.present,
                    markers: hs.present.markers.map((m) => (m.id === selectedMarker.id ? { ...m, label: e.target.value } : m))
                  }
                }))
              }
              onFocus={() => commit(sketch)}
              onBlur={() => !selectedMarker.label?.trim() && removeSelected()}
            />
          )}
          {(selectedMarker?.kind === "net" || selectedMarker?.kind === "smallNet" || selectedMarker?.kind === "obstacle") && (
            <button
              type="button"
              className="btn"
              onClick={() =>
                updateMarker(selectedMarker.id, {
                  angle: ((selectedMarker.angle ?? 0) + (selectedMarker.kind === "obstacle" ? 45 : 90)) % 360
                })
              }
            >
              ⟳ {t.rotate}
            </button>
          )}
          {selectedMarker?.kind === "zone" && (
            <>
              <button
                type="button"
                className="btn btn--icon"
                aria-label={t.smaller}
                disabled={(selectedMarker.size ?? 2) <= 1}
                onClick={() => updateMarker(selectedMarker.id, { size: Math.max(1, (selectedMarker.size ?? 2) - 1) })}
              >
                −
              </button>
              <button
                type="button"
                className="btn btn--icon"
                aria-label={t.larger}
                disabled={(selectedMarker.size ?? 2) >= 4}
                onClick={() => updateMarker(selectedMarker.id, { size: Math.min(4, (selectedMarker.size ?? 2) + 1) })}
              >
                +
              </button>
            </>
          )}
          {selectedLine &&
            LINE_ENDS.map((end) => (
              <button
                key={end}
                type="button"
                className={`chip chip--sm${selectedLine.end === end ? " chip--on" : ""}`}
                onClick={() => updateLine(selectedLine.id, { end })}
              >
                {t.ends[end]}
              </button>
            ))}
          <button type="button" className="btn sk-remove" onClick={removeSelected}>
            {t.remove}
          </button>
        </div>
      )}

      <div className="sk-tools">
        <div className="sk-colors" role="group">
          {SKETCH_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`sk-swatch${color === c ? " sk-swatch--on" : ""}`}
              style={{ background: INK[c] }}
              aria-label={t.colors[c]}
              aria-pressed={color === c}
              onClick={() => pickColor(c)}
            />
          ))}
          <ConfirmButton
            className="btn sk-clear"
            label={t.clear}
            confirmLabel={t.clearConfirm}
            onConfirm={() => {
              commit(emptySketch(sketch.surface));
              setSelectedId(null);
            }}
          />
        </div>
        <div className="sk-palette">
          {toolButton({ t: "select" }, t.move, "select")}
          <span className="sk-palette__gap" aria-hidden="true" />
          {LINE_TOOLS.map((k) => toolButton({ t: "line", kind: k }, t.lines[k], `l-${k}`))}
        </div>
        <div className="sk-palette">
          {MARKER_TOOLS.map((m) =>
            toolButton({ t: "marker", kind: m.kind, label: m.label }, m.name, `m-${m.kind}-${m.label ?? ""}`)
          )}
        </div>
      </div>
    </div>
  );
}
