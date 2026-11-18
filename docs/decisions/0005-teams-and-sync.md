# 0005 — Teams, invites and sync on Render + Neon

- Status: accepted (replaces the Supabase plan in ADR 0001 §3)
- Date: 2026-11-18

## Context

Coaches asked for "Hantera lag": the coach who creates a team is head coach (huvudtränare) and invites fellow coaches easily. The club also wants its data backed up off the phone. The owner chose Render for hosting and Neon for Postgres, both in the EU (Frankfurt).

## Decision

1. **`server/`**: a small Node (Fastify) API on Render, Postgres on Neon (`aws-eu-central-1`). The web apps stay static sites; they call the API with a bearer token (CORS limited to the apps' origins). Cookies are not used: the apps and the API are on different `onrender.com` hosts.
2. **Accounts**: e-mail + name + password. No e-mail service is needed; a head coach can create a one-time password link for a coach (only if every team that coach is in has the requester as head coach). Logins are rate-limited per IP and throttled per account.
3. **Teams and roles**: a team keeps the id the app gave it. Linking a team (first login) makes that coach **head coach**. Roles: `head`, `coach`. Head coaches invite, change roles, remove coaches and can delete the team; a coach can leave. A team always keeps at least one head coach.
4. **Invites**: a link the head coach shares through the phone's share sheet (SMS, WhatsApp, Spond …). Valid 7 days, up to 10 coaches, can be closed. **No search for coaches by name or user id**: a searchable directory would expose coaches' personal data and ids are clumsy to pass on.
5. **Sync, local-first**: documents shaped like the app's types — the team, its sessions and notes, and each coach's own drills (shared read-only with co-coaches; photos stay on the device). The app pushes what changed since the last sync and pulls what changed after its cursor. Last change wins per document (time of the edit on the device, capped at server time + 5 min); notes are append-only. A `scope` hash of the coach's teams and co-coaches makes the server resend everything when membership changes, and the app does a full pull at least every 12 hours. Removed from a team ⇒ the team leaves the phone on the next sync.

## Consequences

- Rink mode, planning and drills still work with no signal; sync is background only. Render's free tier sleeps after 15 minutes idle and takes about a minute to wake: sign-up/join waits, the rest does not.
- Two coaches editing the same plan offline: the later edit wins as a whole document (no field merge). Two coaches opening "Nu kör vi" for the same slot can create two sessions; acceptable for the pilot.
- Backup: the server copy plus Neon's history (6 h on the free plan). A nightly encrypted `pg_dump` needs GitHub Actions, which is not running on the account yet.
- Not yet: club level (club admin across teams), live share-link tokens, curriculum sync (block edits stay per device).
