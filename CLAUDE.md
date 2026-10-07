# Claude working agreement — Hockeytrainer ("Tränarappen")

## What this repo is

A free, Swedish-language planning tool for volunteer youth ice hockey coaches. It connects the club's season plan (curriculum → season blocks → focus skills) to tonight's practice, and runs rink-side offline. The product spec is `SPEC_hockey.md`; read it before changing scope.

- **`web/`** — React + Vite + TypeScript PWA. The only client. See `docs/decisions/0001-web-pwa-local-first.md` for why not Expo.
- **Backend** — not wired yet. Planned: Supabase in an **EU region** (spec §7). Until then all data is local to the device.

## UX language (shared with the sibling app FitBlueprint)

Simple and clear beats feature-rich. Keep to these patterns:

- Fonts: **Caveat 700** for headings, buttons, nav and day labels. **Patrick Hand** for body text. Both are bundled via `@fontsource` so they work offline. Never load fonts from a CDN.
- One **yellow CTA** per screen (`.cta`, `#ffc21a`, thick ink border, offset shadow). Everything else is ink-on-white: `.btn`, `.chip`, `.check`, `.link`.
- Sections: Caveat `h2` with a thick ink rule under it and an optional small gray note on the right (`.section__head`).
- Lists: `.row` = grayscale emoji icon · Caveat day/time label · title + gray sub-line · hand-drawn checkbox. Rows are separated by dashed lines.
- Emoji are monochrome (`filter: grayscale(1)`) except the active nav item.
- Tap targets ≥ 44px; in rink mode ≥ 64px (gloves).
- Check every UI change at 320, 360 and 390 px wide: no horizontal overflow.

## Non-negotiables

- **No player personal data** (spec §4, GDPR). Only a player *count* per team. Coach accounts: email + name only, once auth exists.
- Hosting and data in the **EU**.
- Drill content is **our own** — never copy federation (Svenska Ishockeyförbundet) or third-party drill material. Seed drills and the curriculum are drafts that a club coach must review (spec §9).
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

## Where to start if a task is unclear

1. `SPEC_hockey.md` §5 (MVP features) and §8 (build phases).
2. The spec-coverage table in `README.md`.
3. Default to building in `web/`.
