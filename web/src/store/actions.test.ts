import { describe, expect, it } from "vitest";
import { drillIdsOf, totalMinutes } from "../domain/planner";
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
