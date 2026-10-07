# 0002 — Design B "Isen" instead of the handwriting look

- Status: accepted
- Date: 2026-10-07

## Context

The first version copied the sibling app FitBlueprint: Caveat/Patrick Hand handwriting fonts, wobbly borders, a yellow CTA. The app is used rink-side: quick glances at arm's length, often while moving, sometimes with gloves. The club was shown three alternatives on the real app (A Tydlig, B Isen, C Hybrid) and chose B.

## Decision

- Inter for reading text; Barlow Condensed in caps for headings, labels and clocks.
- Light grey ground with white cards, dark text on light, one blue accent for the primary action.
- Stations are colour + letter (A red, B blue, C green, D purple), never colour alone.
- Rink mode runs on one clock for the whole practice: start once, the feed scrolls by itself, a timeline rail shows progress, a signal marks each new part or rotation. No per-drill taps.

## Why

- Handwriting fonts read slower, especially small and at a glance (general typography consensus; no single verified study for this exact case).
- Dark text on a light background reads better in bright surroundings (Piepenbrock et al., *Ergonomics*, 2013).
- Bigger, nearer targets are faster (Fitts's law); fewer choices are faster (Hick's law).
- Capacitive touch screens generally don't respond to hockey gloves, so the rink screen should not need taps once started.

## Consequences

- The visual link to FitBlueprint is gone; the app has its own sports-app identity.
- Colour carries station identity in rink mode, so the letter must always be shown next to it.
