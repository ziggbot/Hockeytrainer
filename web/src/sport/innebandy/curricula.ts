import type { AgeGroup, Curriculum, SeasonBlock, Skill } from "../../domain/types";

// Floorball levels after Svensk Innebandys utvecklingsmodell (SIU): green,
// blue, red. The philosophy texts and blocks are our own draft, NOT
// federation material — the club adjusts them, and a club coach should read
// them through before the pilot. Game formats as club guidelines quote the
// federation's directives (green: 3 v 3 on a small court, C/B classes
// without goalkeeper; blue: 5 v 5 with goalkeeper) — verify per district.

export const LEVELS: AgeGroup[] = [
  {
    id: "gron",
    name: "Grön 6–9",
    ageMin: 6,
    ageMax: 9,
    gameFormat: "3 mot 3 på liten plan. Klass C och B utan målvakt, klass A med målvakt.",
    goalkeepers: false
  },
  { id: "bla", name: "Blå 9–12", ageMin: 9, ageMax: 12, gameFormat: "5 mot 5 med målvakt." },
  { id: "rod", name: "Röd 12–16", ageMin: 12, ageMax: 16, gameFormat: "5 mot 5 med målvakt på stor plan." }
];

// Season frame: start in late August, series play October–March. Block 3
// wraps the new year (Christmas break inside it).
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
    ageGroupId: "gron",
    philosophy:
      "Lek och rörelseglädje först. Alla har en boll så ofta det går, instruktionerna är korta och alla är i rörelse större delen av passet. Klubbteknik och spel kommer in genom lekar och smålagsspel – att våga försöka är viktigare än resultatet.",
    targetSkills: ["movement", "ballControl", "passing", "gameSense"],
    blocks: blocks("gron", [
      ["Rörelse och boll", ["movement", "ballControl"]],
      ["Bollen nära klubban", ["ballControl"]],
      ["Passa och skjut", ["passing", "shooting"]],
      ["Spela tillsammans", ["gameSense", "feints"]]
    ])
  },
  {
    ageGroupId: "bla",
    philosophy:
      "Grundteknik i att driva, passa och skjuta – först utan press, sedan i fart. Smålagsspel ger många bollkontakter och beslut. Skadeförebyggande uppvärmning varje pass, och målvakterna får egen tid.",
    targetSkills: ["ballControl", "passing", "shooting", "feints", "gameSense"],
    blocks: blocks("bla", [
      ["Bollkontroll i fart", ["ballControl", "movement"]],
      ["Passning och mottagning", ["passing"]],
      ["Avslut", ["shooting", "feints"]],
      ["Spelförståelse", ["gameSense", "defence"]]
    ])
  },
  {
    ageGroupId: "rod",
    philosophy:
      "Tekniken ska fungera i fart och under press. Spelförståelse i över- och underlägen och försvarsspel som lag. Fysträningen blir en egen del av veckan, och skadeförebyggande uppvärmning är fast i varje pass.",
    targetSkills: ["ballControl", "passing", "shooting", "gameSense", "defence"],
    blocks: blocks("rod", [
      ["Teknik i fart", ["ballControl", "passing"]],
      ["Överlägen", ["gameSense", "passing"]],
      ["Avslut under press", ["shooting", "feints"]],
      ["Försvar som lag", ["defence", "gameSense"]]
    ])
  }
];
