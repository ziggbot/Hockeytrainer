# 0004 — Drill sketches in the app

- Status: accepted
- Date: 2026-11-17

## Context

`SPEC_hockey.md` §5 lists a drill diagram editor as out of scope for the MVP; coaches could only attach a photo of a whiteboard. The club asked for a way to draw their own drills and skating patterns on a rink in the app, in the notation coaches already read from printed drill diagrams.

## Decision

1. **Vector sketch stored as data** on the coach's own drill (`Drill.sketch`, `web/src/domain/sketch.ts`), not as an image. It stays editable, is a few kB, fits in localStorage and travels in share links.
2. **Surfaces per sport:** hockey full rink (60 × 30 m), half rink, end zone; floorball full court (40 × 20 m), half court, quarter court (a station). Coordinates are metres; symbols scale with the shown surface so they keep their size on screen.
3. **Notation:**
   - skating: solid line with an open arrowhead
   - skating with the puck/ball: wavy line
   - skating backwards: ticks across the line (with the puck: wavy line with ticks)
   - pass: dashed straight line
   - shot: double straight line with a larger arrowhead
   - stop: two bars across the end of a line
   - players: filled circle in a team colour (red, blue, yellow, black) with an optional letter (X, O, F, B, C, MV, 1–5); coach: black "Tr"; pucks/balls, cones, tires (hockey), nets, small nets, obstacles, shooting zone (shaded circle), short text.
4. **Editing:** tap places a symbol (keep the finger down to slide it), drag draws a line. Strokes are simplified (Ramer–Douglas–Peucker) and drawn as smooth curves (Catmull–Rom). Passes and shots are straight. Undo/redo, recolour, labels, rotation and line ends are on the selected item. On a phone held upright the full rink turns 90° so it fills the screen; held sideways the tools move to a side panel.
5. **Shown** on the drill page, in rink mode under the drill title, and in shared sessions.

## Consequences

- Our own rendering, no third-party diagram assets. The notation follows the common convention seen in coaching diagrams (the club pointed at icehockeysystems.com). That site blocks automated access, so its legend was **not** checked. The backward-skating symbol in particular is a convention we chose; change it in one place (`LineShape` in `web/src/components/SketchShapes.tsx`) if the club's coaches read it differently.
- Sketches are validated field by field on load, import and share-link decode (`cleanSketch`), clamped to the surface and capped (60 lines × 120 points, 80 symbols).
- Seed drills have no sketches yet. Drawing them is content work for a club coach.
