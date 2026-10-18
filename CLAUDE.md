# Claude working agreement — Hockeytrainer ("Tränarappen")

## What this repo is

A free, Swedish-language planning tool for volunteer youth ice hockey coaches. It connects the club's season plan (curriculum → season blocks → focus skills) to tonight's practice, and runs rink-side offline. The product spec is `SPEC_hockey.md`; read it before changing scope.

- **`web/`** — React + Vite + TypeScript PWA. The only client. See `docs/decisions/0001-web-pwa-local-first.md` for why not Expo.
- **Two apps, one code base** (`docs/decisions/0003-sport-packs.md`): the ice hockey app (Färjestad, default build) and the floorball app "Tränarappen Innebandy" (Herrhagens Innebandy, `VITE_SPORT=innebandy`, spec `SPEC_innebandy.md`). Everything sport-specific lives in a pack under `web/src/sport/<sport>/`; read the active one as `SPORT`, never import a pack's content directly in app code. Any change to shared code must keep both builds and both packs' tests green.
- **Backend** — not wired yet. Planned: Supabase in an **EU region** (spec §7). Until then all data is local to the device.

## UX language — design B "Isen" (chosen by the club, see ADR 0002)

Simple, clear and usable rink-side beats feature-rich. Keep to these patterns:

- Fonts: **Inter** (400/600/700) for reading; **Barlow Condensed** 600/700 in caps for headings, labels and clocks (`.display`). Bundled via `@fontsource` so they work offline. Never load fonts from a CDN.
- Light ground (`--bg`) with white cards (`--surface`); dark text on light — it reads best in a bright arena. All colours are tokens in `web/src/design/global.css`.
- One primary button per screen: `.cta` in the club colour (`--cta`, sampled from the crest): Färjestad green in hockey, Herrhagen orange-red in floorball (`:root[data-sport="innebandy"]`). Everything else: `.btn` / `.chip` pills, `.link` (blue `--accent`).
- The club's crest (`SPORT.logo` in `web/public/`, cut out from the club's own artwork) is the symbol top left (`AppMark`). The claude.ai preview builds show the neutral stick-and-puck mark instead: they are published outside the clubs' hosting and must not carry club branding.
- Stations are always **colour + letter** (A red, B blue, C green, D purple) via `stationStyle(i)` — never colour alone.
- Lists: `.rows` is a white card; `.row` = icon · time/day label · title + grey sub-line · checkbox.
- Tap targets ≥ 44px.
- Minimal text: no explanatory hints, section notes or disclaimers unless the screen can't be used without them. The club asked for this explicitly.
- Rink mode needs **no taps after "Starta passet"** (gloves): one clock for the whole practice, the feed scrolls to the running part, a timeline rail ticks on the right, beeps at each new part/rotation. Timeline logic is pure and tested in `web/src/domain/timeline.ts`.
- Check every UI change at 320, 360 and 390 px wide: no horizontal overflow.

## Club's session shape (from the club, keep it)

- The base of every suggested practice: **5 min warm-up** → **5 min gathering and station split** (part type `gather`) → **4 different stations** where the last one (D) is always **a match against small goals** (`g-smallgoals`) + **free zone in the middle** (neutral zone, for players who can't join the rotation). Then, with time left: whole-group focus drill on longer ice → game. Every practice ends with a **closing talk** (part type `closing`): 5 min, 10 from 75 min. 5 minutes left over go to the warm-up (10 min). Built by `allocate`/`assemble` in `web/src/domain/planner.ts`; templates in `web/src/sport/<sport>/templates.ts` list the 3 skill stations and the planner adds the match. The shape itself is data in each pack (`SPORT.shape`).
- **Floorball** uses the same base with its pack's shape: 5 min injury prevention + 5 min ball warm-up, 5 min gathering, 4 stations on quarter courts (20 × 10 m) where D is always 3 v 3 (`ib-g-3v3`), no free zone, closing talk. Levels follow SIU colours (Grön 6–9 without goalkeepers, Blå 9–12, Röd 12–16); drills marked `needsGoalie` are left out for levels without goalkeepers.
- Every segment is a whole number of **5-minute blocks** (5, 10, 15, 20). Steppers move in 5s; seed drill lengths are multiples of 5. Plans from the first app version (e.g. a 42-minute drill) are snapped to the grid on start (`snapToSteps`, `snapOffGridPlans`), and so are share links.
- Changing the planner's output shape: bump `PLAN_VERSION` so untouched upcoming plans are rebuilt on start.

## Non-negotiables

- **No player personal data** (spec §4, GDPR). Only a player *count* per team. Coach accounts: email + name only, once auth exists.
- Hosting and data in the **EU**.
- Drill content is **our own** — never copy federation (Svenska Ishockeyförbundet, Svensk Innebandy) or third-party drill material. Seed drills and the curriculum are drafts that a club coach must review (spec §9).
- Notes are append-only (they will sync as a queue).
- Share links must stay unguessable and read-only. Decoded share payloads are untrusted: validate field by field (`web/src/domain/share.ts`).

## Conventions

- Swedish in user-facing strings, all of them in `web/src/i18n/sv.ts` (i18n-ready for en/fi/no). English in code, comments and docs.
- `PascalCase.tsx` for components and screens, `camelCase.ts` for utilities.
- Domain logic lives in `web/src/domain/` as pure TypeScript with no React, and is unit-tested.
- ADRs in `docs/decisions/NNNN-title.md`.
- Commits: conventional-ish, imperative mood, scoped: `feat(web)`, `fix(web)`, `chore(content)`, `docs:`.

## Tooling

- `cd web && npm install && npm run dev` — local dev on :5173 (also reachable from a phone on the LAN).
- `npm test` — Vitest unit tests (planner, curriculum weeks, equipment, share links, schedule).
- `npm run build` — `tsc -b && vite build`. Run it before committing TS changes.
- `npm run format` — Prettier (config in `web/.prettierrc.json`).
- `npm run dev:innebandy` / `npm run build:innebandy` — the floorball app. `VITE_SPORT=innebandy npm run build:artifact` builds its preview (`dist-artifact-innebandy/tranarappen-innebandy.html`).
- `npm run build:artifact` — single-file preview for claude.ai (`--mode artifact`: memory router, no service worker, assets inlined). Set `VITE_SHARE_BASE` to the artifact URL so share links open the preview. Mode-specific code lives behind `IS_ARTIFACT` in `web/src/platform.ts`.
- Never use `window.confirm`/`prompt`/`alert`: they are blocked in sandboxed frames. Use `ConfirmButton` (two taps) or an in-page notice.

## Where to start if a task is unclear

1. `SPEC_hockey.md` §5 (MVP features) and §8 (build phases).
2. The spec-coverage table in `README.md`.
3. Default to building in `web/`.
