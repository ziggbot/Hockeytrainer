# Hockey Coach App – Project Spec (MVP)

Working name: TBD ("tränarapp")
Status: pre-implementation, October 2026

## 1. Problem

Volunteer youth ice hockey coaches (ages 5 to juniors) plan practices on little time after work. Drill libraries exist (USA Hockey, Hockey Canada, CoachThem, Rinkflow), and team admin is solved (Spond, SportAdmin, Laget.se). What is missing is a **free, Swedish-language tool that connects the club's development plan to tonight's practice** and works rink-side.

## 2. Positioning

- **Club curriculum first, drill library second.**
  - The club defines focus areas per age group and season block.
  - Coaches get ready-made sessions that follow that plan.
- **Rink-side execution.**
  - Offline, readable at a glance, usable with gloves.
  - Station view for cross-ice practices.
- **Complement, don't compete.**
  - No member registry, payments or call-ups. Those stay in SportAdmin and Spond.
  - Import the training schedule via iCal feed only.
- **Free for coaches.** Later funding by club, district association (hockeykontor), federation or sponsor. Not in MVP scope.

## 3. Users and roles

| Role | Does |
|---|---|
| Club admin (head of youth development) | Creates club, age groups, curriculum and season blocks; approves shared drills |
| Coach | Belongs to one or more teams; plans and runs sessions; writes notes |
| Viewer (assistant, parent) | Opens a shared session link, read-only, no account |

## 4. Core concepts (data model)

- **Club**: name, region, default language.
- **AgeGroup**: e.g. U8, U10, U12; birth-year range; adapted game format notes.
- **Team**: belongs to Club and AgeGroup; optional iCal URL for training schedule.
- **Membership**: user ↔ club/team with role.
- **Curriculum**: per Club and AgeGroup; list of target skills and philosophy text.
- **SeasonBlock**: belongs to Curriculum; name, start week, end week, 1–2 focus skill tags.
- **Drill**
  - Basic fields: title, description, coaching points.
  - Planning fields: skill tags, age range, duration, ice area (full / half / third / station), min players.
  - Equipment list (pucks, cones, nets, etc.).
  - Diagram (image or SVG).
  - Visibility: private, club or public.
- **SessionTemplate**: ordered drills with times; tagged to AgeGroup and focus.
- **Session**
  - Team, date and time (often from the iCal import).
  - Ordered drill slots: drill, minutes, station assignment.
  - Generated equipment checklist.
  - Status: planned or done.
- **SessionNote**: free text and quick tags ("repeat", "too hard", "worked well") after practice.

### Data minimisation (GDPR)

- **No player personal data in the MVP.** Store only a player count per session if needed.
- **Coach accounts:** email plus name only.
- **Hosting:** keep everything in the EU.

## 5. MVP features

1. **Auth and club setup.**
   - Email magic link.
   - Create club, invite coaches by link.
2. **Curriculum editor (admin).**
   - Age groups, target skills, season blocks with focus tags.
   - Pre-filled template based on Swedish youth guidance. Content to be verified with the federation or a hockeykontor.
3. **Drill library.**
   - Seed of ~50–100 Swedish drills, own content only (no copying federation material).
   - Filter by age, skill, duration and ice area.
   - Diagram as an uploaded image in the MVP.
4. **Session planner.**
   - "Plan practice" suggests a template matching the team's current block.
   - Coach swaps or reorders drills and adjusts minutes.
   - Total time is validated against slot length.
5. **Equipment checklist.**
   - Auto-generated from the drills in the session.
   - Tick-off at the rink.
6. **Rink mode.**
   - Large-font, offline, full-screen running order with a timer per drill.
   - Station view for multiple coaches.
7. **Share link.** Read-only web view of a session; no account needed.
8. **Post-session notes**, visible to the team's coaches and the club admin.
9. **iCal import.** Read the team's training times; show upcoming slots as "unplanned".
10. **Admin overview.** Which teams planned sessions and which focus areas were covered per block.

### Out of scope for MVP

- Player registry, attendance, payments, chat.
- Drill diagram editor.
- AI session generation (possible later).
- Video hosting.
- SportAdmin or Spond API integration (no public API verified).

## 6. Non-functional requirements

- **Languages:** Swedish UI first; i18n-ready for English, Finnish and Norwegian.
- **Offline-first for rink mode.**
  - Sessions for the next 7 days cached on device.
  - Notes queued and synced later.
- **Platforms:** phone first (iOS and Android); tablet and desktop for admin work.
- **Performance:** rink mode opens in under 1 second from cache.
- **Cost target:** €0–10/month up to roughly 50 clubs.

## 7. Suggested stack

### Client

- **Expo (React Native + TypeScript)** for one codebase covering iOS, Android and web.
  - The web build serves share links and the admin UI.
- Local storage for the offline cache, plus a simple sync queue.
  - No full sync engine in the MVP: sessions are read-mostly offline, and notes are append-only.

### Backend: options (verify current pricing before choosing)

| Option | Cost | Pros | Cons |
|---|---|---|---|
| **A. Supabase (EU region)** | Free tier, then paid plan | Postgres + auth + storage + row-level security; relational model fits well | Free projects can pause when inactive; US-owned company |
| **B. PocketBase on EU VPS (e.g. Hetzner)** | ~€4–6/month | Single binary, SQLite, auth + file storage included; EU-owned host; full control | You operate backups, updates and uptime |
| **C. Firebase (EU region)** | Free tier, pay-as-you-go | Built-in offline sync in Firestore; fast to start | NoSQL is awkward for curriculum/block/session queries; Google lock-in |
| **D. Cloudflare Workers + D1** | Generous free tier | Very cheap at scale, edge-fast | More hand-built auth and storage plumbing |

**Recommendation for MVP: A (Supabase, EU region).**
- **Why:** the relational data model maps directly to Postgres, and row-level security handles club/team access cleanly. You get managed auth with no ops work.
- **Fallback:** move to B if GDPR ownership concerns or the free-tier limits bite. Postgres to SQLite is a manageable migration if you avoid Supabase-specific features early.

### Access rules (row-level security)

- A user sees a club's data only through a Membership.
- Coaches edit their own team's sessions.
- Admins edit the curriculum and club drills.
- Public drills are readable by all.
- Share links use an unguessable token per session.

## 8. Build phases

1. **Foundations.** Auth, club/team/membership, roles, i18n skeleton.
2. **Content.** Drill model, library and filters, seed import script (CSV or JSON to DB).
3. **Planning.** Curriculum and blocks, session planner, equipment checklist.
4. **Rink mode.** Offline cache, timer, station view, notes sync queue.
5. **Sharing and schedule.** Share links (web), iCal import.
6. **Admin overview.**
7. **Pilot.** One club, one or two age groups, four weeks of real use before more features.

## 9. Open questions and risks

- **Drill content is the real bottleneck.** The library must be written or recorded by coaches. Budget the time for it.
- **Federation tools.** Confirm whether the Swedish federation already provides a digital drill bank or planning tool. This is the main threat to the idea.
- **Long-term funding.** Who pays (club, district, sponsor)? Decide before scaling.
- **Spond and Laget.se integration.** Check their API status; SportAdmin has no public API (calendar feed only).
- **Rink mode on iOS.** Verify that the timer and screen-awake behaviour work properly.
