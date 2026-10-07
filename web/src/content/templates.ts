import type { SessionTemplate } from "../domain/types";

// Curated session templates (spec §4 SessionTemplate). The planner prefers
// these when one matches the team's age group and current block focus, and
// scales the minutes to the ice slot. Otherwise it builds a session itself.

export const SEED_TEMPLATES: SessionTemplate[] = [
  {
    id: "t-u8-skating",
    title: "Skridskoglädje",
    ageGroupIds: ["u8"],
    focus: ["skating"],
    parts: [
      { type: "drill", drillId: "w-redlight", minutes: 5 },
      { type: "stations", minutesPerStation: 7, drillIds: ["s-obstacle", "s-edges", "p-slalom", "s-falls"] },
      { type: "drill", drillId: "g-crossice", minutes: 12 }
    ]
  },
  {
    id: "t-u8-puck",
    title: "Puck på klubban",
    ageGroupIds: ["u8"],
    focus: ["puckHandling"],
    parts: [
      { type: "drill", drillId: "w-follow", minutes: 6 },
      { type: "stations", minutesPerStation: 7, drillIds: ["p-ownspace", "p-slalom", "pa-gates"] },
      { type: "drill", drillId: "g-nest", minutes: 6 },
      { type: "drill", drillId: "g-crossice", minutes: 12 }
    ]
  },
  {
    id: "t-u10-passshoot",
    title: "Passa och skjut",
    ageGroupIds: ["u10"],
    focus: ["passing", "shooting"],
    parts: [
      { type: "drill", drillId: "w-passwarm", minutes: 5 },
      { type: "stations", minutesPerStation: 8, drillIds: ["pa-triangle", "sh-dribble", "sh-wrist"] },
      { type: "drill", drillId: "g-3v3", minutes: 12 }
    ]
  },
  {
    id: "t-u10-skating",
    title: "Skridsko i fart",
    ageGroupIds: ["u10"],
    focus: ["skating", "puckHandling"],
    parts: [
      { type: "drill", drillId: "w-kull", minutes: 5 },
      { type: "drill", drillId: "s-crossovers", minutes: 7 },
      { type: "stations", minutesPerStation: 7, drillIds: ["s-tightturns", "s-backward", "p-headsup"] },
      { type: "drill", drillId: "g-crossice", minutes: 12 }
    ]
  },
  {
    id: "t-u12-gamesense",
    title: "Spela ihop",
    ageGroupIds: ["u12"],
    focus: ["gameSense", "passing"],
    parts: [
      { type: "drill", drillId: "w-passwarm", minutes: 5 },
      { type: "drill", drillId: "pa-moving", minutes: 8 },
      { type: "drill", drillId: "pa-givego", minutes: 8 },
      { type: "drill", drillId: "g-keepaway", minutes: 8 },
      { type: "drill", drillId: "g-4nets", minutes: 12 }
    ]
  },
  {
    id: "t-u12-shooting",
    title: "Avslut",
    ageGroupIds: ["u12", "u14"],
    focus: ["shooting"],
    parts: [
      { type: "drill", drillId: "w-mobility", minutes: 6 },
      { type: "drill", drillId: "sh-wrist", minutes: 8 },
      { type: "drill", drillId: "sh-passshot", minutes: 8 },
      { type: "drill", drillId: "sh-rebounds", minutes: 6 },
      { type: "drill", drillId: "g-2v1", minutes: 10 },
      { type: "drill", drillId: "g-3v3", minutes: 10 }
    ]
  },
  {
    id: "t-u14-battles",
    title: "Närkamp och försvar",
    ageGroupIds: ["u12", "u14", "u16", "junior"],
    focus: ["battles"],
    parts: [
      { type: "drill", drillId: "w-mobility", minutes: 6 },
      { type: "drill", drillId: "b-stick", minutes: 6 },
      { type: "drill", drillId: "p-protect", minutes: 6 },
      { type: "drill", drillId: "b-gap", minutes: 8 },
      { type: "drill", drillId: "g-1v1corner", minutes: 8 },
      { type: "drill", drillId: "g-3v3", minutes: 10 }
    ]
  },
  {
    id: "t-u14-skating",
    title: "Skridskoteknik",
    ageGroupIds: ["u14", "u16", "junior"],
    focus: ["skating"],
    parts: [
      { type: "drill", drillId: "w-mobility", minutes: 6 },
      { type: "drill", drillId: "s-crossovers", minutes: 8 },
      { type: "drill", drillId: "s-pivots", minutes: 8 },
      { type: "drill", drillId: "s-tightturns", minutes: 6 },
      { type: "drill", drillId: "s-stops", minutes: 6 },
      { type: "drill", drillId: "g-4nets", minutes: 10 }
    ]
  }
];
