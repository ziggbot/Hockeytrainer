import { describe, expect, it } from "vitest";
import { PLAN_VERSION, drillIdsOf, totalMinutes } from "../domain/planner";
import { createTeam, newTrainingTime, planSession, replanSession } from "./actions";
import { getState } from "./store";

const session = (id: string) => getState().sessions.find((s) => s.id === id)!;
const signature = (id: string) => session(id).templateId ?? drillIdsOf(session(id).parts).sort().join();

describe("planning sessions", () => {
  const team = createTeam({
    name: "U10 Blå",
    ageGroupId: "u10",
    playerCount: 14,
    schedule: [newTrainingTime(4, "18:00", 60), newTrainingTime(6, "18:00", 60)]
  });

  it("gives two practices in the same week different plans", () => {
    const thu = planSession(team, "2026-10-08", "18:00", 60);
    const sat = planSession(team, "2026-10-10", "18:00", 60);
    expect(totalMinutes(session(thu).parts)).toBe(60);
    expect(totalMinutes(session(sat).parts)).toBe(60);
    expect(signature(sat)).not.toBe(signature(thu));
  });

  it("gives a new plan on 'Nytt förslag'", () => {
    const id = planSession(team, "2026-10-13", "18:00", 45);
    const before = signature(id);
    replanSession(id);
    expect(signature(id)).not.toBe(before);
    expect(totalMinutes(session(id).parts)).toBe(45);
  });
});

describe("loading saved data", () => {
  it("drops records that can't be rendered instead of crashing", async () => {
    const { normalizeState } = await import("./store");
    const s = normalizeState({
      version: 1,
      activeTeamId: "t",
      teams: [{ id: "t", name: "T", ageGroupId: "u10", playerCount: 12, schedule: null }, null],
      sessions: [
        { id: "ok", teamId: "t", date: "2026-10-08", start: "18:00", minutes: 60, title: "OK", parts: [], status: "planned" },
        { id: "broken", teamId: "t", date: "2026-10-08", start: "18:00", parts: null }
      ],
      curricula: "nope",
      notes: [{ sessionId: "ok", text: "x", tags: [] }, 7]
    });
    expect(s.teams).toHaveLength(1);
    expect(s.teams[0].schedule).toEqual([]);
    expect(s.sessions.map((x) => x.id)).toEqual(["ok"]);
    expect(s.sessions[0].focus).toEqual([]);
    expect(s.curricula.length).toBeGreaterThan(0);
    expect(s.notes).toHaveLength(1);
    expect(normalizeState("garbage").teams).toEqual([]);
    // Older saves have no coach name; a non-string is dropped.
    expect(s.coachName).toBe("");
    expect(normalizeState({ version: 1, coachName: 42 }).coachName).toBe("");
    expect(normalizeState({ version: 1, coachName: "Anna" }).coachName).toBe("Anna");
  });
});

describe("planner upgrade", () => {
  it("rebuilds untouched upcoming plans in the club's base shape and keeps edited ones", async () => {
    const { setState } = await import("./store");
    const { refreshUntouchedPlans } = await import("./actions");
    const team = createTeam({ name: "Upg", ageGroupId: "u10", playerCount: 14, schedule: [] });
    const old = (id: string, edited: boolean) => ({
      id,
      teamId: team.id,
      date: "2026-11-03",
      start: "18:00",
      minutes: 60,
      title: "Gammalt",
      focus: [],
      parts: [{ id: `${id}-p`, type: "drill" as const, drillId: "w-kull", minutes: 7 }],
      status: "planned" as const,
      equipmentChecked: [],
      createdAt: "2026-10-01T10:00:00Z",
      updatedAt: edited ? "2026-10-02T10:00:00Z" : "2026-10-01T10:00:00Z"
    });
    setState((s) => ({ ...s, sessions: [...s.sessions, old("untouched", false), old("edited", true)] }));
    refreshUntouchedPlans("2026-10-07");
    const rebuilt = session("untouched");
    expect(rebuilt.planVersion).toBe(PLAN_VERSION);
    expect(rebuilt.parts.map((p) => p.type).slice(0, 3)).toEqual(["drill", "gather", "stations"]);
    expect(rebuilt.parts[rebuilt.parts.length - 1].type).toBe("closing");
    expect(rebuilt.parts.some((p) => p.type === "stations" && p.drillIds.length === 4 && p.freeZone)).toBe(true);
    expect(totalMinutes(rebuilt.parts)).toBe(60);
    expect(session("edited").parts).toHaveLength(1);
  });

  it("puts kept plans with first-version minutes on the 5-minute grid without marking them edited", async () => {
    const { setState } = await import("./store");
    const { snapOffGridPlans } = await import("./actions");
    const team = createTeam({ name: "Snap", ageGroupId: "u10", playerCount: 14, schedule: [] });
    setState((s) => ({
      ...s,
      sessions: [
        ...s.sessions,
        {
          id: "done-v1",
          teamId: team.id,
          date: "2026-10-05",
          start: "18:00",
          minutes: 60,
          title: "Gammalt",
          focus: [],
          parts: [
            { id: "a", type: "drill", drillId: "w-kull", minutes: 8 },
            { id: "b", type: "drill", drillId: "pa-triangle", minutes: 42 },
            { id: "c", type: "drill", drillId: "g-3v3", minutes: 10 }
          ],
          status: "done",
          equipmentChecked: [],
          createdAt: "2026-10-01T10:00:00Z",
          updatedAt: "2026-10-05T19:00:00Z"
        }
      ]
    }));
    snapOffGridPlans();
    const snapped = session("done-v1");
    expect(snapped.parts.map((p) => (p.type === "stations" ? p.minutesPerStation : p.minutes))).toEqual([10, 40, 10]);
    expect(snapped.updatedAt).toBe("2026-10-05T19:00:00Z");
  });
});
