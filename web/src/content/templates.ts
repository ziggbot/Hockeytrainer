import type { SessionTemplate } from "../domain/types";

// Curated sessions in the club's standard shape: warm-up 5 → gathering 5 →
// 4 stations with a free zone in the middle → (whole-group focus drill on
// longer ice) → game. Templates list 3 skill stations; the planner adds the
// small-goal match as station D and sets all minutes from the ice time.
// Stations must be drills that fit half an end zone (area "station"/"third").

export const SEED_TEMPLATES: SessionTemplate[] = [
  {
    id: "t-u8-skating",
    title: "Skridskoglädje",
    ageGroupIds: ["u8"],
    focus: ["skating"],
    warmup: "w-redlight",
    extras: ["g-nest"],
    stations: ["s-obstacle", "s-edges", "s-falls"],
    game: "g-crossice"
  },
  {
    id: "t-u8-puck",
    title: "Puck på klubban",
    ageGroupIds: ["u8"],
    focus: ["puckHandling"],
    warmup: "w-follow",
    extras: ["g-nest"],
    stations: ["p-ownspace", "p-slalom", "pa-gates"],
    game: "g-crossice"
  },
  {
    id: "t-u10-passshoot",
    title: "Passa och skjut",
    ageGroupIds: ["u10"],
    focus: ["passing", "shooting"],
    warmup: "w-passwarm",
    extras: ["sh-wrist"],
    stations: ["pa-triangle", "pa-gates", "sh-rebounds"],
    game: "g-3v3"
  },
  {
    id: "t-u10-skating",
    title: "Skridsko i fart",
    ageGroupIds: ["u10"],
    focus: ["skating", "puckHandling"],
    warmup: "w-kull",
    extras: ["s-crossovers"],
    stations: ["s-edges", "s-pivots", "p-slalom"],
    game: "g-crossice"
  },
  {
    id: "t-u12-gamesense",
    title: "Spela ihop",
    ageGroupIds: ["u12"],
    focus: ["gameSense", "passing"],
    warmup: "w-passwarm",
    extras: ["pa-givego"],
    stations: ["pa-triangle", "g-keepaway", "p-protect"],
    game: "g-4nets"
  },
  {
    id: "t-u12-shooting",
    title: "Avslut",
    ageGroupIds: ["u12", "u14"],
    focus: ["shooting"],
    warmup: "w-mobility",
    extras: ["sh-passshot"],
    stations: ["sh-rebounds", "sh-backhand", "pa-triangle"],
    game: "g-3v3"
  },
  {
    id: "t-u14-battles",
    title: "Närkamp och försvar",
    ageGroupIds: ["u12", "u14", "u16", "junior"],
    focus: ["battles"],
    warmup: "w-mobility",
    extras: ["b-gap"],
    stations: ["b-stick", "p-protect", "sh-rebounds"],
    game: "g-1v1corner"
  },
  {
    id: "t-u14-skating",
    title: "Skridskoteknik",
    ageGroupIds: ["u14", "u16", "junior"],
    focus: ["skating"],
    warmup: "w-mobility",
    extras: ["s-crossovers"],
    stations: ["s-pivots", "p-drag", "pa-triangle"],
    game: "g-4nets"
  }
];
