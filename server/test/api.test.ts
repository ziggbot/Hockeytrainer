import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";
import { createPool, type Pool } from "../src/db.js";
import { migrate } from "../src/migrate.js";

const DB = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/tranar_test";
let app: FastifyInstance;
let pool: Pool;

beforeAll(async () => {
  pool = createPool(DB);
  await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(pool, () => undefined);
  const config = {
    ...loadConfig({ DATABASE_URL: DB, ALLOWED_ORIGINS: "https://tranarappen-web.onrender.com" }),
    authRateLimitMax: 10_000
  };
  app = await buildApp({ pool, config, logger: false });
  await app.ready();
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

let n = 0;
const email = (p: string) => `${p}${++n}@example.test`;

class Coach {
  token = "";
  id = "";
  constructor(public name: string) {}
  async req(method: "GET" | "POST" | "PATCH" | "DELETE", url: string, body?: unknown, headers: Record<string, string> = {}) {
    const res = await app.inject({
      method,
      url,
      payload: body as object | undefined,
      headers: { ...(this.token ? { authorization: `Bearer ${this.token}` } : {}), ...headers }
    });
    return { status: res.statusCode, json: res.body ? res.json() : null, headers: res.headers };
  }
  get = (url: string) => this.req("GET", url);
  post = (url: string, body: unknown = {}) => this.req("POST", url, body);
  patch = (url: string, body: unknown) => this.req("PATCH", url, body);
  del = (url: string) => this.req("DELETE", url);
  static async register(name: string) {
    const c = new Coach(name);
    const res = await c.post("/auth/register", { name, email: email(name.toLowerCase()), password: "hemligt123" });
    expect(res.status).toBe(201);
    c.token = res.json.token;
    c.id = res.json.user.id;
    return c;
  }
}

const now = () => new Date().toISOString();
const team = (id: string) => ({
  id,
  sport: "hockey",
  data: { id, name: "U10 Blå", ageGroupId: "u10", playerCount: 14, schedule: [] }
});

/** Head coach with a linked team and a coach who joined through an invite link. */
async function teamWithCoach() {
  const head = await Coach.register("Anna");
  const teamId = crypto.randomUUID();
  expect((await head.post("/teams", team(teamId))).json.role).toBe("head");
  const invite = await head.post(`/teams/${teamId}/invites`);
  expect(invite.status).toBe(201);
  const coach = await Coach.register("Lasse");
  const accepted = await coach.post(`/invites/${invite.json.token}/accept`);
  expect(accepted.json).toEqual({ teamId, sport: "hockey" });
  return { head, coach, teamId, inviteToken: invite.json.token as string };
}

describe("accounts", () => {
  it("register, me, login, logout", async () => {
    const e = email("p");
    const c = new Coach("P");
    const reg = await c.post("/auth/register", { name: "P", email: e, password: "hemligt123" });
    expect(reg.status).toBe(201);
    c.token = reg.json.token;
    expect((await c.get("/me")).json.user.email).toBe(e);
    expect((await c.post("/auth/register", { name: "Q", email: e.toUpperCase(), password: "hemligt123" })).status).toBe(409);
    await c.post("/auth/logout");
    expect((await c.get("/me")).status).toBe(401);
    const login = await new Coach("x").post("/auth/login", { email: e, password: "hemligt123" });
    expect(login.status).toBe(200);
    expect(login.json.token).toBeTruthy();
  });

  it("locks an account after 10 wrong passwords, even from new IPs", async () => {
    const c = await Coach.register("Brute");
    const me = (await c.get("/me")).json.user;
    const anon = new Coach("anon");
    for (let i = 0; i < 10; i++) {
      const r = await anon.req(
        "POST",
        "/auth/login",
        { email: me.email, password: `fel${i}` },
        { "x-forwarded-for": `10.0.0.${i}` }
      );
      expect(r.status).toBe(401);
    }
    expect((await anon.post("/auth/login", { email: me.email, password: "hemligt123" })).status).toBe(429);
  });
});

describe("team management", () => {
  it("the creator is head coach; invited coaches join as coach", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    const members = (await head.get(`/teams/${teamId}/members`)).json;
    expect(members.map((m: { name: string; role: string }) => `${m.name}:${m.role}`)).toEqual(["Anna:head", "Lasse:coach"]);
    expect((await coach.get("/me")).json.teams).toEqual([{ id: teamId, role: "coach", sport: "hockey" }]);
  });

  it("only the head coach invites, manages and deletes", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    expect((await coach.post(`/teams/${teamId}/invites`)).status).toBe(403);
    expect((await coach.patch(`/teams/${teamId}/members/${head.id}`, { role: "coach" })).status).toBe(403);
    expect((await coach.del(`/teams/${teamId}/members/${head.id}`)).status).toBe(403);
    expect((await coach.del(`/teams/${teamId}`)).status).toBe(403);
    const outsider = await Coach.register("Ute");
    expect((await outsider.get(`/teams/${teamId}/members`)).status).toBe(404);
    expect((await outsider.post(`/teams/${teamId}/invites`)).status).toBe(404);
  });

  it("invite info shows the team; links can be closed and run out", async () => {
    const { head, teamId, inviteToken } = await teamWithCoach();
    const info = (await new Coach("anon").get(`/invites/${inviteToken}`)).json;
    expect(info).toMatchObject({ valid: true, teamName: "U10 Blå", invitedBy: "Anna", role: "coach" });
    const list = (await head.get(`/teams/${teamId}/invites`)).json;
    expect(list[0].uses).toBe(1);
    await head.del(`/invites/${list[0].id}`);
    expect((await new Coach("anon").get(`/invites/${inviteToken}`)).json.valid).toBe(false);
    const late = await Coach.register("Sen");
    expect((await late.post(`/invites/${inviteToken}/accept`)).status).toBe(400);
  });

  it("head can hand over the role; the last head cannot leave others behind", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    expect((await head.del(`/teams/${teamId}/members/${head.id}`)).status).toBe(400);
    expect((await head.patch(`/teams/${teamId}/members/${head.id}`, { role: "coach" })).status).toBe(400);
    expect((await head.patch(`/teams/${teamId}/members/${coach.id}`, { role: "head" })).status).toBe(200);
    expect((await head.del(`/teams/${teamId}/members/${head.id}`)).status).toBe(200);
    expect((await coach.get(`/teams/${teamId}/members`)).json).toHaveLength(1);
    // The last member leaving removes the team.
    expect((await coach.del(`/teams/${teamId}/members/${coach.id}`)).status).toBe(200);
    expect((await pool.query("SELECT 1 FROM teams WHERE id = $1", [teamId])).rowCount).toBe(0);
  });

  it("reset links: head coach can help own coaches, not people in other teams", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    const link = await head.post(`/teams/${teamId}/members/${coach.id}/reset-link`);
    expect(link.status).toBe(200);
    const done = await new Coach("anon").post(`/resets/${link.json.token}`, { password: "nyttlosen1" });
    expect(done.status).toBe(200);
    expect((await coach.get("/me")).status).toBe(401); // old sessions revoked

    const other = await Coach.register("Annan");
    const otherTeam = crypto.randomUUID();
    await other.post("/teams", team(otherTeam));
    const inv = await other.post(`/teams/${otherTeam}/invites`);
    const c2 = new Coach("c2");
    c2.token = done.json.token;
    await c2.post(`/invites/${inv.json.token}/accept`);
    expect((await head.post(`/teams/${teamId}/members/${coach.id}/reset-link`)).status).toBe(403);
  });
});

describe("sync between coaches", () => {
  const session = (id: string, teamId: string, title: string) => ({
    kind: "session",
    id,
    teamId,
    updatedAt: now(),
    data: { id, teamId, date: "2026-11-20", start: "17:00", minutes: 60, title, parts: [], status: "planned" }
  });

  it("a plan made by the head coach reaches the coach, and the coach's note reaches the head", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    const push = await head.post("/sync", { sport: "hockey", records: [session("s1", teamId, "Skridsko")] });
    expect(push.json).toEqual({ applied: 1, rejected: [] });

    const pull = (await coach.get("/sync?sport=hockey&since=0")).json;
    expect(pull.full).toBe(true);
    expect(pull.teams).toEqual([{ id: teamId, role: "coach" }]);
    expect(pull.records.map((r: { kind: string; id: string }) => `${r.kind}:${r.id}`).sort()).toEqual(
      [`session:s1`, `team:${teamId}`].sort()
    );

    await coach.post("/sync", {
      sport: "hockey",
      records: [{ kind: "note", id: "n1", teamId, updatedAt: now(), data: { id: "n1", sessionId: "s1", text: "Bra", tags: [] } }]
    });
    // Same teams and co-coaches give the same scope, so the head coach's incremental pull works with it.
    const headPull = (await head.get(`/sync?sport=hockey&since=${pull.cursor}&scope=${pull.scope}`)).json;
    expect(headPull.full).toBe(false);
    expect(headPull.records.map((r: { kind: string; id: string }) => `${r.kind}:${r.id}`)).toEqual(["note:n1"]);
  });

  it("incremental pulls only send what changed after the cursor", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    await head.post("/sync", { sport: "hockey", records: [session("s2", teamId, "A")] });
    const first = (await coach.get("/sync?sport=hockey&since=0")).json;
    const none = (await coach.get(`/sync?sport=hockey&since=${first.cursor}&scope=${first.scope}`)).json;
    expect(none.records).toEqual([]);
    await head.post("/sync", { sport: "hockey", records: [session("s2", teamId, "B")] });
    const next = (await coach.get(`/sync?sport=hockey&since=${first.cursor}&scope=${first.scope}`)).json;
    expect(next.records).toHaveLength(1);
    expect(next.records[0].data.title).toBe("B");
  });

  it("last write wins; an older change does not overwrite a newer one", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    const older = { ...session("s3", teamId, "Gammal"), updatedAt: new Date(Date.now() - 60_000).toISOString() };
    await coach.post("/sync", { sport: "hockey", records: [session("s3", teamId, "Ny")] });
    const res = await head.post("/sync", { sport: "hockey", records: [older] });
    expect(res.json.applied).toBe(0);
    const pull = (await head.get("/sync?sport=hockey&since=0")).json;
    expect(pull.records.find((r: { id: string }) => r.id === "s3").data.title).toBe("Ny");
  });

  it("notes are append-only", async () => {
    const { coach, teamId } = await teamWithCoach();
    const note = (text: string) => ({
      kind: "note",
      id: "n-ap",
      teamId,
      updatedAt: now(),
      data: { id: "n-ap", sessionId: "x", text, tags: [] }
    });
    await coach.post("/sync", { sport: "hockey", records: [note("Första")] });
    expect((await coach.post("/sync", { sport: "hockey", records: [note("Ändrad")] })).json.applied).toBe(0);
    const pull = (await coach.get("/sync?sport=hockey&since=0")).json;
    expect(pull.records.find((r: { id: string }) => r.id === "n-ap").data.text).toBe("Första");
  });

  it("outsiders can neither write to nor read a team", async () => {
    const { head, teamId } = await teamWithCoach();
    await head.post("/sync", { sport: "hockey", records: [session("s4", teamId, "Hemlig")] });
    const outsider = await Coach.register("Ute");
    const write = await outsider.post("/sync", { sport: "hockey", records: [session("s4", teamId, "Kapad")] });
    expect(write.json.rejected[0].reason).toBe("not-a-member");
    // Same id in the outsider's own team must not take over the other team's record.
    const own = crypto.randomUUID();
    await outsider.post("/teams", team(own));
    const hijack = await outsider.post("/sync", { sport: "hockey", records: [session("s4", own, "Kapad")] });
    expect(hijack.json.applied).toBe(0);
    const pull = (await outsider.get("/sync?sport=hockey&since=0")).json;
    expect(pull.records.some((r: { id: string }) => r.id === "s4")).toBe(false);
    const headView = (await head.get("/sync?sport=hockey&since=0")).json;
    expect(headView.records.find((r: { id: string }) => r.id === "s4").data.title).toBe("Hemlig");
  });

  it("a coach's own drills are shared with co-coaches; only the author can change them", async () => {
    const { head, coach } = await teamWithCoach();
    const drill = (title: string) => ({
      kind: "drill",
      id: `own-${coach.id}`,
      updatedAt: now(),
      data: { id: `own-${coach.id}`, title }
    });
    await coach.post("/sync", { sport: "hockey", records: [drill("Lasses övning")] });
    const pull = (await head.get("/sync?sport=hockey&since=0")).json;
    const d = pull.records.find((r: { kind: string }) => r.kind === "drill");
    expect(d.data.title).toBe("Lasses övning");
    expect(d.ownerId).toBe(coach.id);
    expect((await head.post("/sync", { sport: "hockey", records: [drill("Annas ändring")] })).json.applied).toBe(0);
  });

  it("removing a coach changes their scope and the team disappears from their pulls", async () => {
    const { head, coach, teamId } = await teamWithCoach();
    await head.post("/sync", { sport: "hockey", records: [session("s5", teamId, "A")] });
    const before = (await coach.get("/sync?sport=hockey&since=0")).json;
    await head.del(`/teams/${teamId}/members/${coach.id}`);
    const after = (await coach.get(`/sync?sport=hockey&since=${before.cursor}&scope=${before.scope}`)).json;
    expect(after.full).toBe(true);
    expect(after.teams).toEqual([]);
    expect(after.records.some((r: { teamId: string }) => r.teamId === teamId)).toBe(false);
  });

  it("keeps the hockey and floorball apps apart", async () => {
    const { coach } = await teamWithCoach();
    const pull = (await coach.get("/sync?sport=innebandy&since=0")).json;
    expect(pull.teams).toEqual([]);
    expect(pull.records).toEqual([]);
  });
});

describe("http", () => {
  it("allows the web app's origin only (CORS)", async () => {
    const ok = await app.inject({
      method: "OPTIONS",
      url: "/sync",
      headers: { origin: "https://tranarappen-web.onrender.com", "access-control-request-method": "POST" }
    });
    expect(ok.headers["access-control-allow-origin"]).toBe("https://tranarappen-web.onrender.com");
    const bad = await app.inject({
      method: "OPTIONS",
      url: "/sync",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST" }
    });
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("health check does not need the database", async () => {
    expect((await app.inject({ url: "/health" })).json()).toEqual({ ok: true });
  });
});
