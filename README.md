# Tränarappen (working name)

Plan and run youth ice hockey practices from the club's season plan. Swedish UI, works rink-side with no signal. Product spec: [`SPEC_hockey.md`](SPEC_hockey.md).

Design "Isen" (see `docs/decisions/0002-design-b-isen.md`): white cards on light grey, Inter + Barlow Condensed, one blue **"Nu kör vi"** button, colour + letter per station.

## Run it

```bash
cd web
npm install
npm run dev        # http://localhost:5173 (and on your LAN for testing on a phone)
npm test           # unit tests
npm run build      # typecheck + production build (PWA with offline precache)
```

**Live app (Render, deploys from `claude/kind-gauss-8r4pib`):** https://tranarappen-web.onrender.com/ — set up from `render.yaml` (a `web/vercel.json` also exists). No environment variables are needed yet.

**Preview on claude.ai (private):** https://claude.ai/artifact/UgPj73QSapgQk8geGaoRii. It is built as one self-contained HTML file:

```bash
VITE_SHARE_BASE=https://claude.ai/artifact/UgPj73QSapgQk8geGaoRii npm run build:artifact   # → web/dist-artifact/tranarappen.html
```

The preview routes in memory and has no service worker (the sandbox forbids it), so offline mode, "Add to Home Screen" and the backup download only work on a real deployment. Data is saved in the viewer's browser.

## How it works

1. **First run:** team name, age group (U8–Junior), training days and ice time.
2. **Träna (home):** the next ice time with a suggested plan built from the current **season block** (e.g. U10, weeks 34–41 → *Skridskoteknik*). **Nu kör vi** opens rink mode. *Den här veckan* lists the calendar week, Monday first; the big button still finds the next ice time across the week boundary.
3. **Session:** running order with clock times, total vs. ice time, edit mode (minutes ±, reorder, swap, add, station rotations, *Nytt förslag*), equipment checklist, notes, share link.
4. **Rink mode:** tap "Starta passet" once; the screen then follows the clock. The feed scrolls to the running part, a timeline on the right ticks along, and it beeps/vibrates at each new part or station rotation. No taps needed with gloves on. Stations show which group is where (already during the gathering, so the coach can split the groups); each coach can mark *their* station. Ends with quick tags + a note.
5. **Övningar:** 41 seed drills. Filter by age, skill, ice area and length. Coaches can add their own drills, with a photo of a whiteboard sketch.
6. **Säsong:** the age group's blocks with focus skills, the current week highlighted, coverage (✓ when a focus skill was trained in a completed session), editable blocks and philosophy, and recent sessions with notes.

## Spec coverage (MVP §5)

| # | Feature | Status |
|---|---|---|
| 1 | Auth and club setup | **Not started.** Needs the Supabase EU project. Teams are local for now. |
| 2 | Curriculum editor | **Partial.** Blocks (name, weeks, 1–2 focus skills) and philosophy are editable per age group. No admin role, fixed age-group list. |
| 3 | Drill library | **Done (content partial).** 41 own seed drills (spec target 50–100), filters, own drills with image upload. |
| 4 | Session planner | **Done.** Club base: 5 min warm-up → 5 min gathering/station split → 4 stations (D is always a match against small goals) + free zone in the middle → focus drill (longer ice) → game, all in 5-minute steps. Curated templates first, else generated from block focus; varied across the week. |
| 5 | Equipment checklist | **Done.** Max across sequential parts, summed across parallel stations, tick-off. |
| 6 | Rink mode | **Done.** Offline, timer, station view, wake lock. iOS wake-lock behaviour still to verify on a device (spec §9). |
| 7 | Share link | **Interim.** Read-only snapshot in the URL fragment, no account. Becomes a live token link with the backend. |
| 8 | Post-session notes | **Local.** Tags + text, append-only. Visible to other coaches once sync exists. |
| 9 | iCal import | **Not started.** A weekly schedule stands in. Needs a server-side fetch (CORS). |
| 10 | Admin overview | **Partial.** Per-team block coverage. Club-wide overview needs the backend. |

## Before the pilot

- **Content review:** a club coach should read every seed drill (`web/src/content/drills.ts`) and the season plans (`web/src/content/curricula.ts`). Both are app-written drafts, not federation guidance. The library needs roughly 10–60 more drills to reach the spec's 50–100.
- **Backend:** create a Supabase project in an EU region, then add auth (magic link), club/team/membership with row-level security, and sync. See `docs/decisions/0001-web-pwa-local-first.md`.
- **Device check:** rink mode on an iPhone home-screen install (wake lock, timer audio in silent mode).

## Layout

```
web/src/
  domain/      pure TS: types, planner, curriculum weeks, equipment, schedule, share links (+ tests)
  content/     seed drills, curricula, session templates (Swedish)
  store/       local-first state (localStorage) and actions
  i18n/        Swedish strings (sv.ts) + date formatting
  components/  shared UI (nav, checkbox, rink diagram, sheets, stepper)
  screens/     Home, Session, RinkMode, DrillLibrary/Detail/Editor, Season, TeamSettings, SharedSession, Onboarding
  design/      global.css — the FitBlueprint-style design tokens and components
```
