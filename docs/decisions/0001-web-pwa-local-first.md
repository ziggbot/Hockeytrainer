# 0001 — Web PWA, local-first, backend later

- Status: accepted (revisit at pilot)
- Date: 2026-10-07

## Context

`SPEC_hockey.md` §7 *suggests* Expo (React Native + TypeScript) for one codebase covering iOS, Android and web, with Supabase (EU) as backend.

Constraints when implementation started:

- The UX must match the sibling app FitBlueprint: hand-drawn borders, offset ink shadows, Caveat + Patrick Hand fonts, one yellow call-to-action. That look is built from CSS (irregular `border-radius`, `box-shadow`, web fonts). It is quicker to reproduce faithfully on the web than in React Native styling.
- Share links (§5.7) and the admin UI are web anyway.
- The other active project (GrowQuest) is React + Vite + `vite-plugin-pwa` + Supabase, deployed as a static site. Reusing that stack means one toolchain.
- No Supabase EU project exists yet, and creating one is the owner's call (account, region, billing).

## Decision

1. **Client: React 18 + Vite + TypeScript as an installable PWA** (`web/`). Phone-first, works on iOS and Android via "Add to Home Screen". No app stores in the MVP.
2. **Local-first now.** All data lives on the device (`localStorage`) in shapes that mirror the spec's tables (`web/src/domain/types.ts`). Rink mode, the planner and the drill library run fully offline; the app shell and fonts are precached by the service worker.
3. **Backend second.** Supabase (EU region) per spec §7 is still the plan for auth, clubs, memberships and sync. It gets wired in once the project exists.
4. **Share links without a backend for now:** the session snapshot travels in the URL fragment (never sent to a server). It is a snapshot, not live. Replace with an unguessable per-session token when Supabase lands.

## Consequences

- Domain logic (`web/src/domain/`) is plain TypeScript with no React dependency, so an Expo or Capacitor shell later can reuse it unchanged.
- Data is per device until sync exists. Mitigations: a backup export/import under *Laget → Data*, `navigator.storage.persist()`, and an in-app hint to install to the home screen. Safari can evict storage for sites that aren't installed and go unused for a while. Verify the current policy before relying on it.
- Spec §9 "Rink mode on iOS" still applies. The Screen Wake Lock API is requested in rink mode, but its behaviour in iOS home-screen apps must be verified on a real device.
- iCal import (§5.9) needs a server-side fetch: calendar feeds generally don't send CORS headers, so a browser can't read them directly. Until then the team's weekly ice times are entered by hand.
- Revisit this ADR if the pilot needs push notifications, App Store presence, or native-only APIs.
