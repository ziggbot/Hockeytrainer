import type { SessionTemplate } from "../../domain/types";

// Curated floorball sessions in the club's shape: injury-prevention start →
// warm-up → gathering → 4 stations on quarter courts (the planner adds the
// 3 v 3 match as station D) → (whole-group drill on longer hall time) →
// game → closing talk. Templates list 3 skill stations; all minutes come
// from the hall time. Stations must be quarter-court drills ("station").

export const SEED_TEMPLATES: SessionTemplate[] = [
  {
    id: "ib-t-gron-ball",
    title: "Bollen är din kompis",
    ageGroupIds: ["gron"],
    focus: ["ballControl"],
    warmup: "ib-w-colors",
    extras: ["ib-b-speed"],
    stations: ["ib-b-slalom", "ib-b-ownspace", "ib-b-turns"],
    game: "ib-g-halfcourt"
  },
  {
    id: "ib-t-gron-pass",
    title: "Passa kompisen",
    ageGroupIds: ["gron"],
    focus: ["passing", "shooting"],
    warmup: "ib-w-follow",
    extras: ["ib-f-2v0"],
    stations: ["ib-p-pairs", "ib-p-gates", "ib-s-wrist"],
    game: "ib-g-empty"
  },
  {
    id: "ib-t-gron-play",
    title: "Spela tillsammans",
    ageGroupIds: ["gron"],
    focus: ["gameSense", "feints"],
    warmup: "ib-w-tag",
    extras: ["ib-b-speed"],
    stations: ["ib-f-cone", "ib-b-headsup", "ib-d-mirror"],
    game: "ib-g-king"
  },
  {
    id: "ib-t-bla-control",
    title: "Bollkontroll i fart",
    ageGroupIds: ["bla"],
    focus: ["ballControl", "movement"],
    warmup: "ib-w-ladder",
    extras: ["ib-b-speed"],
    stations: ["ib-b-turns", "ib-b-protect", "ib-b-headsup"],
    game: "ib-g-4goals"
  },
  {
    id: "ib-t-bla-pass",
    title: "Passning och mottagning",
    ageGroupIds: ["bla"],
    focus: ["passing"],
    warmup: "ib-w-passwarm",
    extras: ["ib-f-2v0"],
    stations: ["ib-p-triangle", "ib-p-receive", "ib-p-givego"],
    game: "ib-g-numbers"
  },
  {
    id: "ib-t-bla-shoot",
    title: "Avslut",
    ageGroupIds: ["bla"],
    focus: ["shooting", "feints"],
    warmup: "ib-w-follow",
    extras: ["ib-s-run"],
    stations: ["ib-s-wrist", "ib-s-afterpass", "ib-f-cone"],
    game: "ib-g-halfcourt"
  },
  {
    id: "ib-t-bla-game",
    title: "Spelförståelse",
    ageGroupIds: ["bla"],
    focus: ["gameSense", "defence"],
    warmup: "ib-w-tag",
    extras: ["ib-f-2v1"],
    stations: ["ib-g-keepaway", "ib-d-lane", "ib-f-lane"],
    game: "ib-g-5v5"
  },
  {
    id: "ib-t-rod-tech",
    title: "Teknik i fart",
    ageGroupIds: ["rod"],
    focus: ["ballControl", "passing"],
    warmup: "ib-w-ladder",
    extras: ["ib-p-long"],
    stations: ["ib-b-protect", "ib-p-receive", "ib-p-givego"],
    game: "ib-g-5v5"
  },
  {
    id: "ib-t-rod-press",
    title: "Avslut under press",
    ageGroupIds: ["rod"],
    focus: ["shooting", "feints"],
    warmup: "ib-w-passwarm",
    extras: ["ib-s-run"],
    stations: ["ib-s-afterpass", "ib-s-angle", "ib-f-lane"],
    game: "ib-g-winback"
  },
  {
    id: "ib-t-rod-defence",
    title: "Försvar som lag",
    ageGroupIds: ["rod"],
    focus: ["defence", "gameSense"],
    warmup: "ib-w-follow",
    extras: ["ib-f-2v1"],
    stations: ["ib-d-lane", "ib-f-lane", "ib-s-rebound"],
    game: "ib-g-5v5"
  }
];
