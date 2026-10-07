import type { AgeGroup, Curriculum, SeasonBlock, Skill } from "../domain/types";

// Pre-filled club curriculum (spec §5.2). This is a neutral starting point
// written for the app, NOT federation guidance — the club admin adjusts it,
// and the content should be verified with a hockeykontor before the pilot.

export const AGE_GROUPS: AgeGroup[] = [
  { id: "u8", name: "U8", ageMin: 5, ageMax: 8, gameFormat: "Spel på tvären eller i zon, 3 mot 3 med småmål." },
  { id: "u10", name: "U10", ageMin: 9, ageMax: 10, gameFormat: "Spel på tvären eller halvplan, 3 mot 3 eller 4 mot 4." },
  {
    id: "u12",
    name: "U12",
    ageMin: 11,
    ageMax: 12,
    gameFormat: "Helplan 5 mot 5 införs – fortsatt mycket smålagsspel på träning."
  },
  { id: "u14", name: "U14", ageMin: 13, ageMax: 14, gameFormat: "Helplan 5 mot 5." },
  { id: "u16", name: "U16", ageMin: 15, ageMax: 16, gameFormat: "Helplan 5 mot 5." },
  { id: "junior", name: "Junior", ageMin: 17, ageMax: 20, gameFormat: "Helplan 5 mot 5." }
];

// Season frame shared by all age groups: four blocks from late August to
// March. Block 3 wraps the new year.
const WEEKS: [number, number][] = [
  [34, 41],
  [42, 49],
  [50, 5],
  [6, 12]
];

function blocks(prefix: string, defs: [string, Skill[]][]): SeasonBlock[] {
  return defs.map(([name, focus], i) => ({
    id: `${prefix}-b${i + 1}`,
    name,
    startWeek: WEEKS[i][0],
    endWeek: WEEKS[i][1],
    focus
  }));
}

export const SEED_CURRICULA: Curriculum[] = [
  {
    ageGroupId: "u8",
    philosophy:
      "Lek, rörelseglädje och massor av skridskoåkning. Alla har en puck så ofta det går. Korta förklaringar och mycket aktivitet – varje spelare ska vara i rörelse större delen av passet.",
    targetSkills: ["skating", "puckHandling", "gameSense"],
    blocks: blocks("u8", [
      ["Skridskoglädje", ["skating"]],
      ["Puck på klubban", ["puckHandling", "skating"]],
      ["Passa till kompisen", ["passing"]],
      ["Skjut och spela", ["shooting", "gameSense"]]
    ])
  },
  {
    ageGroupId: "u10",
    philosophy:
      "Grundteknik i skridsko och puckkontroll genom lek och tävling. Stationsträning ger många repetitioner. Börja koppla ihop passning och skott.",
    targetSkills: ["skating", "puckHandling", "passing", "shooting"],
    blocks: blocks("u10", [
      ["Skridskoteknik", ["skating"]],
      ["Puckkontroll i fart", ["puckHandling", "skating"]],
      ["Passa och skjut", ["passing", "shooting"]],
      ["Spela tillsammans", ["gameSense", "passing"]]
    ])
  },
  {
    ageGroupId: "u12",
    philosophy:
      "Tekniken ska fungera i fart. Spelförståelse genom smålagsspel: hitta fri yta, skapa passningsvinklar och stötta puckföraren.",
    targetSkills: ["skating", "puckHandling", "passing", "shooting", "gameSense"],
    blocks: blocks("u12", [
      ["Teknik i fart", ["skating", "puckHandling"]],
      ["Passningsspel", ["passing", "gameSense"]],
      ["Avslut", ["shooting"]],
      ["1 mot 1", ["battles", "gameSense"]]
    ])
  },
  {
    ageGroupId: "u14",
    philosophy:
      "Teknik under press och i högt tempo. Närkamp och kroppsposition införs stegvis. Individuell utveckling går före lagresultat.",
    targetSkills: ["skating", "passing", "shooting", "gameSense", "battles"],
    blocks: blocks("u14", [
      ["Skridskokraft", ["skating"]],
      ["Närkamp", ["battles"]],
      ["Uppspel och stöd", ["gameSense", "passing"]],
      ["Avslut i fart", ["shooting"]]
    ])
  },
  {
    ageGroupId: "u16",
    philosophy: "Beslut i hög fart. Spelsystem introduceras i små steg, men smålagsspel är fortfarande grunden på isen.",
    targetSkills: ["skating", "passing", "shooting", "gameSense", "battles"],
    blocks: blocks("u16", [
      ["Teknik i fart", ["skating", "puckHandling"]],
      ["Spelförståelse", ["gameSense"]],
      ["Närkamp", ["battles"]],
      ["Avslut", ["shooting", "gameSense"]]
    ])
  },
  {
    ageGroupId: "junior",
    philosophy: "Prestation och egen utveckling i balans. Spelaren tar allt mer ansvar för sin egen träning.",
    targetSkills: ["skating", "passing", "shooting", "gameSense", "battles"],
    blocks: blocks("junior", [
      ["Skridskokraft", ["skating"]],
      ["Spelförståelse", ["gameSense", "passing"]],
      ["Närkamp", ["battles"]],
      ["Avslut", ["shooting"]]
    ])
  }
];
