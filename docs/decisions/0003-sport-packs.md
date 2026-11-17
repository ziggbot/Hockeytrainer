# 0003 — One code base, two sports (sport packs)

- Status: accepted
- Date: 2026-10-18

## Context

The club wants a floorball (innebandy) version of the app for Herrhagens Innebandy, next to the ice hockey app for Färjestad. Most of the work in the hockey app is not about hockey: the week view, the planner's 5-minute grid and station rotation, the one-clock live mode, share links, offline storage and data migrations. What differs is content (drills, curricula, templates), a few words (ice time / hall time), the playing surface, equipment, skills, the club's session shape and the branding.

Options: copy the repository and change it, or keep one code base and select the sport at build time.

## Decision

- One repository and one code base. `web/src/sport/` holds a `SportPack` per sport (`hockey`, `innebandy`): content, the skills / areas / equipment the screens offer, the club's session shape (warm-up, injury-prevention opener, gathering, match station, free zone, station areas), crest and storage prefix.
- The sport is chosen at build time: `VITE_SPORT=innebandy` builds the floorball app, no variable builds the hockey app. Each app is its own deployment with its own URL, PWA name and stored data.
- Domain types are shared; unions cover both sports. The planner takes the session shape as data instead of hockey constants.
- Swedish labels stay in `i18n/sv.ts`; the few words that differ per sport sit in one table there.

## Why

- A fix to the planner, live mode or storage reaches both apps at once. Two copies would drift apart and every fix would be made twice.
- The differences are data, not behaviour, so a pack can hold them.

## Consequences

- Changing shared code can break the other sport. Tests run both packs (`src/sport/sport.test.ts`), and every change is checked in both builds.
- The hockey app's stored data keeps its keys (`hockeytrainer.*`); the floorball app uses `innebandytranare.*`.
- Each club's crest lives in `web/public/` and is shown only in its own deployment; the claude.ai previews show a neutral mark.
