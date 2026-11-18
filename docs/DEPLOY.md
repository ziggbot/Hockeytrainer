# Deploy: Render + Neon

Three Render services from `render.yaml`: the hockey app, the floorball app (static sites) and the team API (`server/`, Node). The database is Postgres on Neon. Everything runs in Frankfurt.

## 1. Neon (database)

1. <https://console.neon.tech> → **New project** → region **AWS Europe (Frankfurt)** (`aws-eu-central-1`; it cannot be changed later).
2. **Connect** → turn on **Connection pooling** → copy the connection string (host contains `-pooler`). Treat it as a password; never commit it (the repo is public).

The API creates its tables on start.

## 2. Render

The existing static sites come from `render.yaml`. After this branch is on the deploy branch (`claude/kind-gauss-8r4pib`):

1. Render → the Blueprint → **Sync** (or wait for auto-sync). It creates **tranarappen-api**.
2. `DATABASE_URL` is declared with `sync: false`, so Render does **not** ask for it on an update: open **tranarappen-api → Environment**, add `DATABASE_URL` = the Neon string, save. The service starts (`/health` answers).
3. Check the real hosts in the dashboard. If Render gave a service another URL than `<name>.onrender.com`, fix `VITE_API_URL` (both static sites) and `ALLOWED_ORIGINS` (the API) — in `render.yaml` or in the dashboard — and redeploy.
4. Open the app → **Laget → Hantera lag** → create an account. The team is now on the server and you are head coach. **Bjud in tränare** shares a link.

## Costs and limits (check render.com/pricing and neon.com/pricing)

- Render free: the API sleeps after 15 min without traffic; waking takes about a minute. The apps work meanwhile (local-first); only sign-up/join waits. Upgrade the API to a paid instance for the pilot if that bothers the coaches.
- Neon free: 1 GB per project, 100 CU-hours/month, scales to zero after 5 min, 6 h restore window.

## Local development

```bash
# API (needs a Postgres; DATABASE_URL to it)
cd server && npm install && DATABASE_URL=postgresql://localhost/tranar npm run dev   # :3001
cd server && TEST_DATABASE_URL=postgresql://localhost/tranar_test npm test

# App against the local API
cd web && VITE_API_URL=http://localhost:3001 npm run dev
```
