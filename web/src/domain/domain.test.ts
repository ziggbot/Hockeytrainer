import { describe, expect, it } from "vitest";
import { isoWeek, isoWeeksInYear, parseISODate } from "./dates";
import { currentBlock } from "./curriculum";
import {
  MATCH_STATION_ID,
  allocate,
  drillIdsOf,
  generatePlan,
  matchingTemplates,
  suggestPlan,
  templateDrillIds,
  totalMinutes
} from "./planner";
import { equipmentFor } from "./equipment";
import { insertGather, setPartMinutes } from "./editParts";
import { decodeShare, encodeShare } from "./share";
import { nextSlot, upcomingSlots } from "./schedule";
import { AGE_GROUPS, SEED_CURRICULA } from "../content/curricula";
import { SEED_DRILLS } from "../content/drills";
import { SEED_TEMPLATES } from "../content/templates";
import type { Drill, PartDraft, Session, SessionPart, Team } from "./types";

const isStep = (m: number) => m > 0 && m % 5 === 0;
const minutesOf = (parts: PartDraft[]) => parts.map((p) => (p.type === "stations" ? p.minutesPerStation : p.minutes));

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
      for (const id of templateDrillIds(t)) {
        const d = drillsById.get(id);
        expect(d, `${t.id} → ${id}`).toBeDefined();
        for (const g of t.ageGroupIds) {
          const group = ag(g);
          expect(d!.ageMin <= group.ageMax && d!.ageMax >= group.ageMin, `${id} for ${g}`).toBe(true);
        }
      }
    }
  });

  it("templates have 3 different skill stations that fit half an end zone", () => {
    for (const t of SEED_TEMPLATES) {
      expect(new Set(t.stations).size, t.id).toBe(3);
      expect(t.stations, t.id).not.toContain(MATCH_STATION_ID);
      for (const id of t.stations) expect(["station", "third"], `${t.id} → ${id}`).toContain(drillsById.get(id)!.iceArea);
    }
  });

  it("has the small-goal match drill for every age group", () => {
    const match = drillsById.get(MATCH_STATION_ID)!;
    expect(match).toMatchObject({ kind: "game", iceArea: "station" });
    expect(match.equipment.some((e) => e.item === "smallNets")).toBe(true);
    for (const a of AGE_GROUPS) expect(match.ageMin <= a.ageMin && match.ageMax >= a.ageMax, a.id).toBe(true);
  });

  it("seed drill lengths are whole 5-minute blocks", () => {
    for (const d of SEED_DRILLS) expect(isStep(d.minutes), d.id).toBe(true);
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
  it.each([25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 120])("splits %i min into 5-minute segments", (t) => {
    const a = allocate(t);
    const sum = a.warmup + a.gather + a.perStation * 4 + a.extras.reduce((x, y) => x + y, 0) + a.game;
    expect(sum).toBe(t);
    for (const m of [a.warmup, ...a.extras]) expect(isStep(m)).toBe(true);
    expect(a.perStation % 5).toBe(0);
    expect(a.game % 5).toBe(0);
    expect(a.game).toBeLessThanOrEqual(20);
    expect(a.warmup).toBe(5);
    expect(a.gather).toBe(a.perStation > 0 ? 5 : 0);
    for (const m of a.extras) expect(m >= 10 && m <= 20).toBe(true);
  });

  it("opens with 5 min warm-up and 5 min gathering, then 4 × 5 below an hour and 4 × 10 from an hour", () => {
    expect(allocate(30)).toEqual({ warmup: 5, gather: 5, perStation: 5, extras: [], game: 0 });
    expect(allocate(45)).toEqual({ warmup: 5, gather: 5, perStation: 5, extras: [], game: 15 });
    expect(allocate(60)).toEqual({ warmup: 5, gather: 5, perStation: 10, extras: [], game: 10 });
    expect(allocate(90)).toEqual({ warmup: 5, gather: 5, perStation: 10, extras: [15, 10], game: 15 });
  });

  it("skips the rotation when the ice time is too short", () => {
    expect(allocate(25)).toEqual({ warmup: 5, gather: 0, perStation: 0, extras: [], game: 20 });
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
    expect(s.parts.map((p) => p.type)).toEqual(["drill", "gather", "stations", "drill"]);
    const stations = s.parts.find((p) => p.type === "stations");
    expect(stations).toMatchObject({ drillIds: ["pa-triangle", "pa-gates", "sh-rebounds", MATCH_STATION_ID], freeZone: true });
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

  it.each(AGE_GROUPS.map((a) => a.id))("generates the base, 4 stations + free zone and a game for %s", (id) => {
    for (const block of cur(id).blocks) {
      for (const minutes of [45, 60, 90]) {
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
        for (const m of minutesOf(plan.parts)) expect(isStep(m)).toBe(true);
        expect(plan.parts[0]).toMatchObject({ type: "drill", minutes: 5 });
        expect(plan.parts[1]).toEqual({ type: "gather", minutes: 5 });
        const stations = plan.parts[2];
        expect(stations?.type === "stations" && stations.drillIds.length, `${id} ${block.name}`).toBe(4);
        expect(stations).toMatchObject({ freeZone: true });
        expect(stations?.type === "stations" && stations.drillIds[3]).toBe(MATCH_STATION_ID);
        const ids = drillIdsOf(plan.parts);
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

  it.each(AGE_GROUPS.map((a) => a.id))("every suggestion for %s starts with the club's base", (id) => {
    const ctx = {
      ageGroup: ag(id),
      playerCount: 14,
      focus: cur(id).blocks[0].focus,
      targetSkills: cur(id).targetSkills,
      minutes: 60,
      drills: SEED_DRILLS,
      templates: SEED_TEMPLATES
    };
    const count = matchingTemplates(ctx).length + 3;
    for (let variant = 0; variant < count; variant++) {
      const parts = suggestPlan({ ...ctx, variant }).parts;
      expect(parts.slice(0, 2), `${id} v${variant}`).toMatchObject([
        { type: "drill", minutes: 5 },
        { type: "gather", minutes: 5 }
      ]);
      const stations = parts[2];
      expect(stations.type === "stations" && stations.drillIds, `${id} v${variant}`).toHaveLength(4);
      expect(stations.type === "stations" && stations.drillIds.indexOf(MATCH_STATION_ID)).toBe(3);
      expect(totalMinutes(parts)).toBe(60);
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

describe("editing the plan", () => {
  const parts: SessionPart[] = [
    { id: "w", type: "drill", drillId: "w-kull", minutes: 5 },
    { id: "s", type: "stations", minutesPerStation: 10, drillIds: ["s-edges", "p-slalom"] }
  ];

  it("puts a gathering back right before the rotation", () => {
    const g: SessionPart = { id: "g", type: "gather", minutes: 5 };
    expect(insertGather(parts, g).map((p) => p.id)).toEqual(["w", "g", "s"]);
    expect(insertGather([parts[0]], g).map((p) => p.id)).toEqual(["w", "g"]);
  });

  it("steps a gathering's minutes like a drill's", () => {
    const g: SessionPart = { id: "g", type: "gather", minutes: 5 };
    expect(setPartMinutes([g], "g", 10)).toEqual([{ id: "g", type: "gather", minutes: 10 }]);
    expect(setPartMinutes([g], "g", 0)).toEqual([{ id: "g", type: "gather", minutes: 5 }]);
  });
});

describe("equipment", () => {
  it("takes the max across sequential parts and sums stations", () => {
    const lines = equipmentFor(
      [
        { id: "1", type: "drill", drillId: "w-follow", minutes: 6 }, // pucks: 1 per player
        { id: "g", type: "gather", minutes: 5 },
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
        { id: "g", type: "gather", minutes: 5 },
        { id: "b", type: "drill", drillId: own.id, minutes: 35 }
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
      { type: "gather", minutes: 5 },
      { type: "drill", drillId: "own-1", minutes: 35 }
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
      parts: [
        { type: "drill", drillId: "w-kull", minutes: 5 },
        { type: "html", body: "<script>" },
        { type: "gather", minutes: "5" },
        { type: "gather", minutes: 900, extra: "<b>" },
        null
      ],
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
    expect(decoded.parts).toEqual([
      { type: "drill", drillId: "w-kull", minutes: 5 },
      { type: "gather", minutes: 60 }
    ]);
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
