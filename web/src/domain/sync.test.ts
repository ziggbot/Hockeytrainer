import { describe, expect, it } from "vitest";
import type { AppState } from "../store/store";
import {
  applyPull,
  collectDocs,
  hashDoc,
  keyOf,
  localChanges,
  markDirty,
  stableStringify,
  type PulledRecord,
  type Shadow
} from "./sync";
import type { Drill, Session, Team } from "./types";

const team = (id: string, name = "U10"): Team => ({ id, name, ageGroupId: "u10", playerCount: 12, schedule: [] });
const session = (id: string, teamId: string, title = "Pass"): Session => ({
  id,
  teamId,
  date: "2026-11-20",
  start: "17:00",
  minutes: 60,
  title,
  focus: [],
  parts: [],
  status: "planned",
  equipmentChecked: [],
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z"
});
const drill = (id: string, extra: Partial<Drill> = {}): Drill => ({
  id,
  title: "Egen",
  description: "",
  coachingPoints: [],
  skills: ["passing"],
  kind: "drill",
  ageMin: 8,
  ageMax: 12,
  minutes: 10,
  iceArea: "half",
  minPlayers: 2,
  equipment: [],
  visibility: "private",
  source: "own",
  ...extra
});
const state = (p: Partial<AppState> = {}): AppState => ({
  version: 1,
  coachName: "Anna",
  teams: [],
  activeTeamId: null,
  curricula: [],
  ownDrills: [],
  ownTemplates: [],
  sessions: [],
  notes: [],
  ...p
});
const rec = (p: Partial<PulledRecord> & Pick<PulledRecord, "kind" | "id">): PulledRecord => ({
  teamId: null,
  ownerId: null,
  data: {},
  deleted: false,
  updatedAt: "2026-11-18T10:00:00.000Z",
  ...p
});
const ME = "me-1";

describe("hashing", () => {
  it("ignores key order (the server's jsonb reorders keys) and undefined fields", () => {
    expect(stableStringify({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: undefined } })).toBe('{"a":{"d":[1,{"x":1,"y":2}]},"b":1}');
    expect(hashDoc({ a: 1, b: 2 })).toBe(hashDoc({ b: 2, a: 1 }));
    expect(hashDoc({ a: 1 })).not.toBe(hashDoc({ a: 2 }));
  });
});

describe("collectDocs", () => {
  it("takes linked teams, their sessions and notes, and my drills without photos", () => {
    const s = state({
      teams: [team("t1"), team("local-only")],
      sessions: [session("s1", "t1"), session("s2", "local-only")],
      notes: [
        { id: "n1", sessionId: "s1", text: "Bra", tags: [], createdAt: "" },
        { id: "n2", sessionId: "s2", text: "x", tags: [], createdAt: "" }
      ],
      ownDrills: [drill("own-a", { diagram: "data:image/jpeg;base64,AAAA" }), drill("own-b", { ownerId: "other" })]
    });
    const docs = collectDocs(s, new Set(["t1"]), ME);
    expect([...docs.keys()].sort()).toEqual(["drill:own-a", "note:n1", "session:s1", "team:t1"]);
    expect(docs.get("note:n1")?.teamId).toBe("t1");
    expect(docs.get("drill:own-a")?.data.diagram).toBeUndefined();
  });

  it("syncs nothing before a team is linked", () => {
    expect(collectDocs(state({ ownDrills: [drill("own-a")] }), new Set(), ME).size).toBe(0);
  });
});

describe("change tracking", () => {
  it("finds new, edited and removed documents and keeps the first change time", () => {
    const docs = collectDocs(state({ teams: [team("t1")], sessions: [session("s1", "t1")] }), new Set(["t1"]), ME);
    const shadow: Shadow = {
      [keyOf("team", "t1")]: { h: hashDoc(docs.get("team:t1")!.data), t: "t1" },
      [keyOf("session", "gone")]: { h: "x", t: "t1" },
      [keyOf("note", "kept-forever")]: { h: "x", t: "t1" }
    };
    expect(localChanges(docs, shadow)).toEqual({ changed: ["session:s1"], removed: ["session:gone"] });
    const dirty = markDirty(docs, shadow, { "session:s1": "2026-11-18T09:00:00Z" }, "2026-11-18T10:00:00Z");
    expect(dirty).toEqual({ "session:s1": "2026-11-18T09:00:00Z", "session:gone": "2026-11-18T10:00:00Z" });
  });
});

describe("applyPull", () => {
  it("adds the team, sessions, notes and a co-coach's drill from the server", () => {
    const records = [
      rec({ kind: "team", id: "t1", teamId: "t1", data: team("t1", "U10 Blå") as never }),
      rec({ kind: "session", id: "s1", teamId: "t1", data: session("s1", "t1", "Skridsko") as never }),
      rec({ kind: "note", id: "n1", teamId: "t1", data: { id: "n1", sessionId: "s1", text: "Bra", tags: [], createdAt: "" } }),
      rec({ kind: "drill", id: "own-x", ownerId: "co-coach", data: drill("own-x") as never })
    ];
    const res = applyPull(state(), records, { me: ME, shadow: {}, dirty: {}, full: true, teamIds: ["t1"] });
    expect(res.state.teams.map((t) => t.name)).toEqual(["U10 Blå"]);
    expect(res.state.activeTeamId).toBe("t1");
    expect(res.state.sessions[0].title).toBe("Skridsko");
    expect(res.state.notes).toHaveLength(1);
    expect(res.state.ownDrills[0].ownerId).toBe("co-coach");
    expect(Object.keys(res.shadow).sort()).toEqual(["drill:own-x", "note:n1", "session:s1", "team:t1"]);
  });

  it("keeps a newer local change and lets an older one lose", () => {
    const local = state({ teams: [team("t1")], sessions: [session("s1", "t1", "Lokal")] });
    const server = rec({ kind: "session", id: "s1", teamId: "t1", data: session("s1", "t1", "Server") as never });
    const newer = applyPull(local, [server], {
      me: ME,
      shadow: {},
      dirty: { "session:s1": "2026-11-18T11:00:00.000Z" },
      full: false,
      teamIds: ["t1"]
    });
    expect(newer.state.sessions[0].title).toBe("Lokal");
    expect(newer.dirty["session:s1"]).toBeDefined();
    const older = applyPull(local, [server], {
      me: ME,
      shadow: {},
      dirty: { "session:s1": "2026-11-18T09:00:00.000Z" },
      full: false,
      teamIds: ["t1"]
    });
    expect(older.state.sessions[0].title).toBe("Server");
    expect(older.dirty["session:s1"]).toBeUndefined();
  });

  it("removes deleted sessions, never touches existing notes, keeps the local photo of my drill", () => {
    const local = state({
      teams: [team("t1")],
      sessions: [session("s1", "t1")],
      notes: [{ id: "n1", sessionId: "s1", text: "Min", tags: [], createdAt: "" }],
      ownDrills: [drill("own-a", { diagram: "data:x", title: "Gammal" })]
    });
    const res = applyPull(
      local,
      [
        rec({ kind: "session", id: "s1", teamId: "t1", deleted: true, data: null }),
        rec({ kind: "note", id: "n1", teamId: "t1", data: { id: "n1", sessionId: "s1", text: "Ändrad", tags: [] } }),
        rec({ kind: "drill", id: "own-a", ownerId: ME, data: drill("own-a", { title: "Ny" }) as never })
      ],
      { me: ME, shadow: {}, dirty: {}, full: false, teamIds: ["t1"] }
    );
    expect(res.state.sessions).toEqual([]);
    expect(res.state.notes[0].text).toBe("Min");
    expect(res.state.ownDrills[0]).toMatchObject({ title: "Ny", diagram: "data:x" });
    expect(res.state.ownDrills[0].ownerId).toBeUndefined();
  });

  it("on a full pull, drops a team the coach was removed from, with its sessions and notes", () => {
    const local = state({
      teams: [team("t1"), team("t2")],
      activeTeamId: "t1",
      sessions: [session("s1", "t1"), session("s2", "t2")],
      notes: [{ id: "n1", sessionId: "s1", text: "", tags: [], createdAt: "" }],
      ownDrills: [drill("own-co", { ownerId: "co" }), drill("own-mine")]
    });
    const shadow: Shadow = { "team:t1": { h: "x", t: "t1" }, "session:s1": { h: "x", t: "t1" }, "team:t2": { h: "x", t: "t2" } };
    const res = applyPull(local, [], { me: ME, shadow, dirty: {}, full: true, teamIds: ["t2"] });
    expect(res.state.teams.map((t) => t.id)).toEqual(["t2"]);
    expect(res.state.activeTeamId).toBe("t2");
    expect(res.state.sessions.map((s) => s.id)).toEqual(["s2"]);
    expect(res.state.notes).toEqual([]);
    expect(res.state.ownDrills.map((d) => d.id)).toEqual(["own-mine"]);
    expect(Object.keys(res.shadow)).toEqual(["team:t2"]);
  });

  it("keeps local teams that were never synced", () => {
    const res = applyPull(state({ teams: [team("new")] }), [], { me: ME, shadow: {}, dirty: {}, full: true, teamIds: [] });
    expect(res.state.teams.map((t) => t.id)).toEqual(["new"]);
  });
});
