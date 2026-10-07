import { describe, expect, it } from "vitest";
import { isoWeek, isoWeeksInYear, parseISODate } from "./dates";
import { currentBlock } from "./curriculum";
import { drillIdsOf, fitToMinutes, generatePlan, matchingTemplates, suggestPlan, totalMinutes } from "./planner";
import { equipmentFor } from "./equipment";
import { decodeShare, encodeShare } from "./share";
import { nextSlot, upcomingSlots } from "./schedule";
import { AGE_GROUPS, SEED_CURRICULA } from "../content/curricula";
import { SEED_DRILLS } from "../content/drills";
import { SEED_TEMPLATES } from "../content/templates";
import type { Drill, PartDraft, Session, Team } from "./types";

const drillsById = new Map(SEED_DRILLS.map((d) => [d.id, d]));
const ag = (id: string) => AGE_GROUPS.find((a) => a.id === id)!;
const cur = (id: string) => SEED_CURRICULA.find((c) => c.ageGroupId === id)!;

describe("dates", () => {
  it("computes ISO weeks", () => {
    expect(isoWeek(parseISODate("2026-10-07"))).toBe(41);
    expect(isoWeek(parseISODate("2026-01-01"))).toBe(1); // Thursday
    expect(isoWeek(parseISODate("2027-01-01"))).toBe(53); // Friday → last week of 2026
    expect(isoWeeksInYear(2026)).toBe(53);
    expect(isoWeeksInYear(2025)).toBe(52);
  });
});

describe("curriculum", () => {
  it("finds the block for a date", () => {
    const pos = currentBlock(cur("u10"), parseISODate("2026-10-07"));
    expect(pos?.block.name).toBe("Skridskoteknik");
    expect(pos).toMatchObject({ weekIndex: 8, weekCount: 8 });
  });

  it("handles a block that wraps the new year", () => {
    // Block 3 is v50–v5. 2026 has 53 ISO weeks → 4 weeks before New Year.
    const before = currentBlock(cur("u10"), parseISODate("2026-12-09")); // v50
    expect(before).toMatchObject({ weekIndex: 1, weekCount: 9 });
    const after = currentBlock(cur("u10"), parseISODate("2027-01-13")); // v2
    expect(after?.block.id).toBe("u10-b3");
    expect(after).toMatchObject({ weekIndex: 6, weekCount: 9 });
  });

  it("returns null between seasons", () => {
    expect(currentBlock(cur("u10"), parseISODate("2026-07-01"))).toBeNull();
  });
});

describe("seed content", () => {
  it("has unique drill ids", () => {
    expect(new Set(SEED_DRILLS.map((d) => d.id)).size).toBe(SEED_DRILLS.length);
  });

  it("templates only use existing drills suitable for their age groups", () => {
    for (const t of SEED_TEMPLATES) {
      for (const id of drillIdsOf(t.parts)) {
        const d = drillsById.get(id);
        expect(d, `${t.id} → ${id}`).toBeDefined();
        for (const g of t.ageGroupIds) {
          const group = ag(g);
          expect(d!.ageMin <= group.ageMax && d!.ageMax >= group.ageMin, `${id} for ${g}`).toBe(true);
        }
      }
    }
  });

  it("every curriculum has blocks with 1–2 focus skills", () => {
    for (const c of SEED_CURRICULA) {
      expect(AGE_GROUPS.some((a) => a.id === c.ageGroupId)).toBe(true);
      for (const b of c.blocks) expect(b.focus.length).toBeGreaterThanOrEqual(1);
      for (const b of c.blocks) expect(b.focus.length).toBeLessThanOrEqual(2);
    }
  });
});

describe("planner", () => {
  const parts: PartDraft[] = [
    { type: "drill", drillId: "w-kull", minutes: 5 },
    { type: "stations", minutesPerStation: 7, drillIds: ["s-edges", "s-obstacle", "p-slalom", "s-falls"] },
    { type: "drill", drillId: "g-crossice", minutes: 12 }
  ];

  it.each([30, 45, 50, 60, 75, 90])("fits a plan to %i minutes", (target) => {
    const fitted = fitToMinutes(parts, target);
    expect(totalMinutes(fitted)).toBe(target);
    for (const p of fitted) expect(p.type === "drill" ? p.minutes : p.minutesPerStation).toBeGreaterThanOrEqual(3);
  });

  it("prefers a template matching the block focus", () => {
    const s = suggestPlan({
      ageGroup: ag("u10"),
      playerCount: 16,
      focus: ["passing", "shooting"],
      targetSkills: cur("u10").targetSkills,
      minutes: 50,
      drills: SEED_DRILLS,
      templates: SEED_TEMPLATES,
      variant: 0
    });
    expect(s.templateId).toBe("t-u10-passshoot");
    expect(totalMinutes(s.parts)).toBe(50);
  });

  it("falls back to a generated plan after the templates run out", () => {
    const ctx = {
      ageGroup: ag("u10"),
      playerCount: 16,
      focus: ["passing" as const, "shooting" as const],
      targetSkills: cur("u10").targetSkills,
      minutes: 45,
      drills: SEED_DRILLS,
      templates: SEED_TEMPLATES
    };
    const count = matchingTemplates(ctx).length;
    const s = suggestPlan({ ...ctx, variant: count });
    expect(s.templateId).toBeUndefined();
    expect(totalMinutes(s.parts)).toBe(45);
  });

  it.each(AGE_GROUPS.map((a) => a.id))("generates an age-appropriate plan for %s in every block", (id) => {
    for (const block of cur(id).blocks) {
      for (const minutes of [45, 60]) {
        const plan = generatePlan(
          {
            ageGroup: ag(id),
            playerCount: 14,
            focus: block.focus,
            targetSkills: cur(id).targetSkills,
            minutes,
            drills: SEED_DRILLS,
            templates: [],
            variant: 0
          },
          0
        );
        expect(totalMinutes(plan.parts)).toBe(minutes);
        const ids = drillIdsOf(plan.parts);
        expect(ids.length).toBeGreaterThanOrEqual(3);
        expect(new Set(ids).size).toBe(ids.length);
        expect(drillsById.get(ids[0])!.kind).toBe("warmup");
        expect(drillsById.get(ids[ids.length - 1])!.kind).toBe("game");
        for (const d of ids) {
          const drill = drillsById.get(d)!;
          const group = ag(id);
          expect(drill.ageMin <= group.ageMax + 2 && drill.ageMax >= group.ageMin - 2, `${d} for ${id}`).toBe(true);
        }
      }
    }
  });

  it("gives different suggestions for different variants", () => {
    const base = {
      ageGroup: ag("u12"),
      playerCount: 16,
      focus: cur("u12").blocks[0].focus,
      targetSkills: cur("u12").targetSkills,
      minutes: 60,
      drills: SEED_DRILLS,
      templates: [],
      variant: 0
    };
    const a = drillIdsOf(generatePlan(base, 0).parts).join();
    const others = [1, 2, 3, 4].map((v) => drillIdsOf(generatePlan(base, v).parts).join());
    expect(others.some((o) => o !== a)).toBe(true);
  });
});

describe("equipment", () => {
  it("takes the max across sequential parts and sums stations", () => {
    const lines = equipmentFor(
      [
        { id: "1", type: "drill", drillId: "w-follow", minutes: 6 }, // pucks: 1 per player
        { id: "2", type: "stations", minutesPerStation: 7, drillIds: ["s-edges", "p-slalom"] }, // cones 8 + 8
        { id: "3", type: "drill", drillId: "g-3v3", minutes: 10 } // pinnies 6, nets 2, pucks 10
      ],
      drillsById,
      16
    );
    const get = (item: string) => lines.find((l) => l.item === item)?.count;
    expect(get("pucks")).toBe(16);
    expect(get("cones")).toBe(16);
    expect(get("pinnies")).toBe(6);
    expect(get("smallNets")).toBe(2);
    expect(get("goals")).toBeUndefined();
  });
});

describe("share link", () => {
  it("round-trips a session and embeds only own drills", () => {
    const own: Drill = {
      ...SEED_DRILLS[0],
      id: "own-1",
      title: "Min övning – åäö",
      source: "own",
      diagram: "data:image/png;base64,xyz"
    };
    const byId = new Map(drillsById).set(own.id, own);
    const session: Session = {
      id: "s1",
      teamId: "t1",
      date: "2026-10-08",
      start: "18:00",
      minutes: 45,
      title: "Passa och skjut",
      focus: ["passing"],
      parts: [
        { id: "a", type: "drill", drillId: "w-kull", minutes: 5 },
        { id: "b", type: "drill", drillId: own.id, minutes: 40 }
      ],
      status: "planned",
      equipmentChecked: [],
      createdAt: "",
      updatedAt: ""
    };
    const decoded = decodeShare(encodeShare(session, "U10 Blå", byId));
    expect(decoded?.title).toBe("Passa och skjut");
    expect(decoded?.team).toBe("U10 Blå");
    expect(decoded?.parts).toEqual([
      { type: "drill", drillId: "w-kull", minutes: 5 },
      { type: "drill", drillId: "own-1", minutes: 40 }
    ]);
    expect(decoded?.drills.map((d) => d.id)).toEqual(["own-1"]);
    expect(decoded?.drills[0].diagram).toBeUndefined();
    expect(decoded?.drills[0].title).toBe("Min övning – åäö");
  });

  it("rejects garbage", () => {
    expect(decodeShare("not-a-link")).toBeNull();
  });

  it("sanitizes a hand-crafted payload", () => {
    const evil = {
      v: 1,
      title: { toString: "x" },
      parts: [{ type: "drill", drillId: "w-kull", minutes: 5 }, { type: "html", body: "<script>" }, null],
      drills: [
        { id: "own-x", title: "X", diagram: "javascript:alert(1)", skills: ["hacking"], coachingPoints: "nope", source: "seed" }
      ]
    };
    const json = JSON.stringify(evil);
    const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const decoded = decodeShare(b64)!;
    expect(decoded.title).toBe("");
    expect(decoded.parts).toEqual([{ type: "drill", drillId: "w-kull", minutes: 5 }]);
    expect(decoded.drills[0]).toMatchObject({ id: "own-x", skills: ["gameSense"], coachingPoints: [], source: "own" });
    expect("diagram" in decoded.drills[0]).toBe(false);
  });
});

describe("schedule", () => {
  const team: Team = {
    id: "t1",
    name: "U10",
    ageGroupId: "u10",
    playerCount: 14,
    schedule: [
      { id: "a", weekday: 2, start: "18:00", minutes: 45 }, // Tuesday
      { id: "b", weekday: 4, start: "17:15", minutes: 60 } // Thursday
    ]
  };

  it("lists the rolling week and merges planned sessions", () => {
    const planned = { teamId: "t1", date: "2026-10-08", start: "17:15", minutes: 60, status: "planned" } as Session;
    const slots = upcomingSlots(team, [planned], parseISODate("2026-10-07")); // Wednesday
    expect(slots.map((s) => `${s.date} ${s.start}`)).toEqual(["2026-10-08 17:15", "2026-10-13 18:00"]);
    expect(slots[0].session).toBe(planned);
  });

  it("keeps a practice in progress as the next slot", () => {
    const tue = parseISODate("2026-10-13");
    const slots = upcomingSlots(team, [], tue);
    const during = new Date(2026, 9, 13, 18, 30);
    expect(nextSlot(slots, during)?.date).toBe("2026-10-13");
    const after = new Date(2026, 9, 13, 19, 0);
    expect(nextSlot(slots, after)?.date).toBe("2026-10-15");
  });
});
