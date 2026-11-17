import { describe, expect, it } from "vitest";
import { allocate, drillIdsOf, matchingTemplates, suggestPlan, templateDrillIds, totalMinutes } from "../domain/planner";
import type { PartDraft } from "../domain/types";
import { hockey } from "./hockey";
import { innebandy } from "./innebandy";
import type { SportPack } from "./types";

// Rules every sport pack must follow, plus the floorball club shape.

const isStep = (m: number) => m > 0 && m % 5 === 0;
const minutesOf = (parts: PartDraft[]) => parts.map((p) => (p.type === "stations" ? p.minutesPerStation : p.minutes));

describe.each([hockey, innebandy])("sport pack $id", (pack: SportPack) => {
  const byId = new Map(pack.drills.map((d) => [d.id, d]));
  const level = (id: string) => pack.ageGroups.find((a) => a.id === id)!;

  it("has unique drills on the 5-minute grid, using only the sport's lists", () => {
    expect(byId.size).toBe(pack.drills.length);
    for (const d of pack.drills) {
      expect(isStep(d.minutes), d.id).toBe(true);
      expect(pack.areas, d.id).toContain(d.iceArea);
      for (const s of d.skills) expect(pack.skills, `${d.id} ${s}`).toContain(s);
      for (const e of d.equipment) expect(pack.equipment, `${d.id} ${e.item}`).toContain(e.item);
      expect(d.coachingPoints.length, d.id).toBeGreaterThan(0);
    }
  });

  it("has the match station and prevention drill it plans with", () => {
    const match = byId.get(pack.shape.matchStationId)!;
    expect(match).toMatchObject({ kind: "game" });
    expect(pack.shape.stationAreas).toContain(match.iceArea);
    if (pack.shape.prevention) expect(byId.get(pack.shape.prevention)).toMatchObject({ kind: "warmup" });
  });

  it("has a curriculum per level with 1–2 focus skills per block", () => {
    for (const a of pack.ageGroups) {
      const c = pack.curricula.find((x) => x.ageGroupId === a.id)!;
      expect(c, a.id).toBeDefined();
      for (const b of c.blocks) {
        expect(b.focus.length).toBeGreaterThanOrEqual(1);
        expect(b.focus.length).toBeLessThanOrEqual(2);
        for (const s of b.focus) expect(pack.skills).toContain(s);
      }
    }
    expect(pack.ageGroups.map((a) => a.id)).toContain(pack.defaultAgeGroupId);
  });

  it("has templates with 3 skill stations that fit a station, for its own levels", () => {
    for (const t of pack.templates) {
      expect(new Set(t.stations).size, t.id).toBe(3);
      expect(t.stations, t.id).not.toContain(pack.shape.matchStationId);
      expect(t.warmup, t.id).not.toBe(pack.shape.prevention);
      for (const id of t.stations) expect(pack.shape.stationAreas, `${t.id} → ${id}`).toContain(byId.get(id)!.iceArea);
      for (const id of templateDrillIds(t)) {
        const d = byId.get(id);
        expect(d, `${t.id} → ${id}`).toBeDefined();
        for (const g of t.ageGroupIds) {
          const group = level(g);
          expect(group, `${t.id} level ${g}`).toBeDefined();
          expect(d!.ageMin <= group.ageMax && d!.ageMax >= group.ageMin, `${id} for ${g}`).toBe(true);
          if (group.goalkeepers === false) expect(d!.needsGoalie, `${id} needs a goalie for ${g}`).toBeFalsy();
        }
      }
    }
  });

  it.each([15, 30, 45, 60, 75, 90, 120, 180])("keeps every suggestion on the grid and inside %i min", (minutes) => {
    for (const a of pack.ageGroups) {
      const c = pack.curricula.find((x) => x.ageGroupId === a.id)!;
      const ctx = {
        ageGroup: a,
        playerCount: 14,
        targetSkills: c.targetSkills,
        minutes,
        drills: pack.drills,
        templates: pack.templates,
        shape: pack.shape
      };
      for (const block of c.blocks) {
        const count = matchingTemplates({ ...ctx, focus: block.focus }).length + 2;
        for (let variant = 0; variant < count; variant++) {
          const parts = suggestPlan({ ...ctx, focus: block.focus, variant }).parts;
          const at = `${a.id} ${block.name} ${minutes} v${variant}`;
          for (const m of minutesOf(parts)) expect(isStep(m), at).toBe(true);
          expect(totalMinutes(parts), at).toBe(minutes);
          expect(parts[parts.length - 1].type, at).toBe("closing");
          if (pack.shape.prevention) expect(parts[0], at).toMatchObject({ drillId: pack.shape.prevention, minutes: 5 });
          const ids = drillIdsOf(parts);
          expect(new Set(ids).size, at).toBe(ids.length);
          if (a.goalkeepers === false) for (const id of ids) expect(byId.get(id)!.needsGoalie, `${at} ${id}`).toBeFalsy();
        }
      }
    }
  });
});

describe("innebandy session shape", () => {
  const gron = innebandy.ageGroups.find((a) => a.id === "gron")!;
  const cur = innebandy.curricula.find((c) => c.ageGroupId === "gron")!;
  const plan = (minutes: number, variant = 0) =>
    suggestPlan({
      ageGroup: gron,
      playerCount: 14,
      focus: cur.blocks[0].focus,
      targetSkills: cur.targetSkills,
      minutes,
      drills: innebandy.drills,
      templates: innebandy.templates,
      variant,
      shape: innebandy.shape
    }).parts;

  it("allocates 10 min warm-up, 5 gathering, 4 stations and a closing talk", () => {
    expect(allocate(60, 4, innebandy.shape)).toEqual({ warmup: 10, gather: 5, perStation: 10, extras: [], game: 0, closing: 5 });
    // 5 minutes over don't stretch a 10-minute warm-up; they become a short game.
    expect(allocate(45, 4, innebandy.shape)).toEqual({ warmup: 10, gather: 5, perStation: 5, extras: [], game: 5, closing: 5 });
    expect(allocate(75, 4, innebandy.shape)).toEqual({
      warmup: 10,
      gather: 5,
      perStation: 10,
      extras: [],
      game: 10,
      closing: 10
    });
  });

  it("opens with injury prevention, rotates on quarter courts with 3 v 3 as D, and has no free zone", () => {
    const parts = plan(60);
    expect(parts.map((p) => p.type)).toEqual(["drill", "drill", "gather", "stations", "closing"]);
    expect(parts[0]).toEqual({ type: "drill", drillId: "ib-w-legs", minutes: 5 });
    expect(parts[1]).toMatchObject({ type: "drill", minutes: 5 });
    const stations = parts[3];
    expect(stations).toMatchObject({ minutesPerStation: 10, freeZone: false });
    expect(stations.type === "stations" && stations.drillIds).toHaveLength(4);
    expect(stations.type === "stations" && stations.drillIds[3]).toBe("ib-g-3v3");
  });
});
