import type { Drill, EquipmentNeed } from "../domain/types";

// Seed drill library. Own content only (spec §5.3: no copying federation
// material). Written as a starting point — every drill should be read
// through by a club coach before the pilot (spec §9: content is the
// real bottleneck).

type SeedDrill = Omit<Drill, "visibility" | "source">;

const perPlayer = (item: EquipmentNeed["item"]): EquipmentNeed => ({ item, count: "perPlayer" });
const perPair = (item: EquipmentNeed["item"]): EquipmentNeed => ({ item, count: "perPair" });
const n = (item: EquipmentNeed["item"], count: number): EquipmentNeed => ({ item, count });

const seed: SeedDrill[] = [
  // ── Uppvärmning ─────────────────────────────────────────────
  {
    id: "w-kull",
    title: "Kull i zonen",
    description:
      "Två–tre tagare med västar. Övriga åker fritt i zonen. Den som blir kullad står still med klubban högt över huvudet tills en kompis rör vid hen – då är man fri igen. Byt tagare ofta.",
    coachingPoints: ["Huvudet uppe – se var tagarna är", "Korta, snabba kliv vid riktningsbyten", "Byt tagare var 60:e sekund"],
    skills: ["skating"],
    kind: "warmup",
    ageMin: 5,
    ageMax: 12,
    minutes: 5,
    iceArea: "third",
    minPlayers: 6,
    equipment: [n("pinnies", 3)]
  },
  {
    id: "w-follow",
    title: "Följa John med puck",
    description:
      "Spelarna åker i led efter en ledare, alla med puck. Ledaren hittar på svängar, stopp och vändningar – alla gör likadant. Byt ledare var 45:e sekund.",
    coachingPoints: [
      "Pucken framför kroppen, inte vid skridskorna",
      "Titta upp på ledaren – känn pucken med bladet",
      "Håll två klubblängders avstånd"
    ],
    skills: ["skating", "puckHandling"],
    kind: "warmup",
    ageMin: 5,
    ageMax: 12,
    minutes: 6,
    iceArea: "half",
    minPlayers: 4,
    equipment: [perPlayer("pucks")]
  },
  {
    id: "w-redlight",
    title: "Röd lampa – grön lampa",
    description:
      "Spelarna står på en linje. Tränaren ropar ”grönt” – alla åker mot tränaren. ”Rött” – alla stannar. Den som inte hinner stanna åker tillbaka till start.",
    coachingPoints: ["Stanna med plogstopp eller hockeystopp", "Snabb start: korta, kraftiga kliv", "Låg position – böj knäna"],
    skills: ["skating"],
    kind: "warmup",
    ageMin: 5,
    ageMax: 9,
    minutes: 5,
    iceArea: "third",
    minPlayers: 4,
    equipment: []
  },
  {
    id: "w-mobility",
    title: "Rörlighet i rörelse",
    description:
      "Spelarna åker lugnt runt rinken och gör övningar längs vägen: armcirklar, utfallssteg i glid, knälyft, djupa knäböj i glid och överkorsningar i kurvorna. Öka tempot sista varvet.",
    coachingPoints: [
      "Lugnt första varvet – öka gradvis",
      "Knäböj i glid: rak rygg, blicken framåt",
      "Överkorsningar i kurvorna – åt båda hållen"
    ],
    skills: ["skating"],
    kind: "warmup",
    ageMin: 11,
    ageMax: 20,
    minutes: 6,
    iceArea: "full",
    minPlayers: 1,
    equipment: []
  },
  {
    id: "w-passwarm",
    title: "Passningar i par",
    description:
      "I par, 3–4 meter isär. Forehandpassningar, sedan backhand. Efter två minuter: fortsätt passa medan båda åker sidledes längs isen.",
    coachingPoints: [
      "Klubban på isen – visa var du vill ha pucken",
      "Ta emot med mjuk klubba – ge efter",
      "Passa från bladets mitt"
    ],
    skills: ["passing"],
    kind: "warmup",
    ageMin: 8,
    ageMax: 20,
    minutes: 5,
    iceArea: "half",
    minPlayers: 2,
    equipment: [perPair("pucks")]
  },

  // ── Skridsko ────────────────────────────────────────────────
  {
    id: "s-edges",
    title: "Skärslalom mellan koner",
    description:
      "Koner i en rad med 2–3 meters mellanrum. Spelarna åker slalom med båda skridskorna på isen och växlar mellan inner- och ytterskär. Andra varvet: på ett ben.",
    coachingPoints: [
      "Knäna böjda, vikten mitt på skenan",
      "Axlarna stilla – svängen kommer från benen",
      "Se framåt, inte ner i isen"
    ],
    skills: ["skating"],
    kind: "drill",
    ageMin: 6,
    ageMax: 14,
    minutes: 8,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("cones", 8)]
  },
  {
    id: "s-crossovers",
    title: "Överkorsningar runt cirkeln",
    description:
      "Spelarna åker runt tekningscirkeln med överkorsningar. Byt riktning efter två varv. Utmaning: gör det med en puck på klubban.",
    coachingPoints: [
      "Yttre benet kliver över, inre benet trycker under kroppen",
      "Luta in mot cirkelns mitt",
      "Klubban på isen innanför cirkeln"
    ],
    skills: ["skating"],
    kind: "drill",
    ageMin: 7,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 1,
    equipment: []
  },
  {
    id: "s-stops",
    title: "Stopp och start mellan linjerna",
    description:
      "Åk från mållinjen till närmaste blålinje – stopp – tillbaka till mållinjen – stopp – vidare till rödlinjen och så vidare. Stoppa varannan gång med ansiktet mot ena sargen, varannan mot den andra.",
    coachingPoints: [
      "De yngsta: plogstopp först, sedan hockeystopp",
      "Sänk kroppen i stoppet – knäna böjda",
      "De första kliven korta och snabba"
    ],
    skills: ["skating"],
    kind: "drill",
    ageMin: 6,
    ageMax: 20,
    minutes: 6,
    iceArea: "full",
    minPlayers: 1,
    equipment: []
  },
  {
    id: "s-backward",
    title: "Baklänges C-skär",
    description:
      "Spelarna åker baklänges längs isen och ”ritar” ett C med varje skridsko. Först med båda händerna på klubban, sedan med en hand. Tillbaka framlänges.",
    coachingPoints: [
      "Sitt som på en stol – rak rygg",
      "Tryck ut med hela skenan, inte med tån",
      "Titta över axeln då och då för att se vart du åker"
    ],
    skills: ["skating"],
    kind: "drill",
    ageMin: 6,
    ageMax: 14,
    minutes: 6,
    iceArea: "half",
    minPlayers: 1,
    equipment: []
  },
  {
    id: "s-pivots",
    title: "Vändningar vid konerna",
    description:
      "Åk framlänges mot en kon, vänd till baklänges vid konen och åk baklänges till nästa. Vänd tillbaka till framlänges. Vänd åt båda hållen.",
    coachingPoints: [
      "Fötterna nära varandra i vändningen, låg position",
      "Axlarna håller samma riktning genom vändningen",
      "Klubban på isen hela tiden"
    ],
    skills: ["skating"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 8,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("cones", 4)]
  },
  {
    id: "s-obstacle",
    title: "Hinderbana",
    description:
      "Bygg en bana: slalom mellan koner, hoppa över klubbor som ligger på isen, huka under en klubba som vilar på två koner, åk runt ett däck och spurta i mål.",
    coachingPoints: ["Böj knäna inför hoppet – landa mjukt", "Ner och upp snabbt under hindret", "Kontroll först, fart sedan"],
    skills: ["skating"],
    kind: "drill",
    ageMin: 5,
    ageMax: 10,
    minutes: 8,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("cones", 6), n("sticksOnIce", 4), n("tires", 2)]
  },
  {
    id: "s-tightturns",
    title: "Snäva svängar i sicksack",
    description:
      "Koner i sicksack över isen. Spelarna gör snäva svängar runt varje kon och växlar riktning. Lägg till puck när det går bra.",
    coachingPoints: ["Huvud och axlar leder svängen", "Inre skridskon leder, yttre trycker", "Accelerera ut ur svängen"],
    skills: ["skating"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "half",
    minPlayers: 1,
    equipment: [n("cones", 6)]
  },
  {
    id: "s-falls",
    title: "Ramla och res dig",
    description:
      "Spelarna åker fritt. Tränaren ropar ”ner!” – alla går ner på knä eller magen och reser sig så snabbt de kan. Gör det till en tävling: vem är först upp?",
    coachingPoints: ["Upp via ett knä – en fot i taget", "Båda händerna på klubban när du reser dig", "Ramla framåt, inte bakåt"],
    skills: ["skating"],
    kind: "drill",
    ageMin: 5,
    ageMax: 8,
    minutes: 5,
    iceArea: "station",
    minPlayers: 1,
    equipment: []
  },

  // ── Puckkontroll ────────────────────────────────────────────
  {
    id: "p-ownspace",
    title: "Puckkontroll på stället",
    description:
      "Varje spelare med en puck i eget utrymme. Tränaren ropar varianter: bred dribbling, smal dribbling, framför kroppen, vid sidan, runt skridskon. 20 sekunder per variant.",
    coachingPoints: [
      "Mjuka händer – nedre handen lös",
      "Rulla handlederna, bladet över pucken",
      "Försök titta upp mellan varven"
    ],
    skills: ["puckHandling"],
    kind: "drill",
    ageMin: 6,
    ageMax: 14,
    minutes: 6,
    iceArea: "station",
    minPlayers: 1,
    equipment: [perPlayer("pucks")]
  },
  {
    id: "p-headsup",
    title: "Huvudet uppe – räkna fingrar",
    description:
      "Spelarna dribblar fritt i zonen. Tränaren håller upp fingrar – spelarna ropar antalet. Byt tempo när tränaren blåser.",
    coachingPoints: [
      "Känn pucken med bladet, se med ögonen",
      "Pucken nära kroppen när det är trångt",
      "Små kliv runt de andra spelarna"
    ],
    skills: ["puckHandling", "skating"],
    kind: "drill",
    ageMin: 7,
    ageMax: 14,
    minutes: 6,
    iceArea: "third",
    minPlayers: 4,
    equipment: [perPlayer("pucks")]
  },
  {
    id: "p-slalom",
    title: "Puckslalom genom koner",
    description:
      "Spelarna dribblar slalom genom konerna, en i taget i led. Varianter: bara forehand, bara backhand, med en hand på klubban.",
    coachingPoints: ["Pucken mitt på bladet", "Flytta pucken brett runt konen", "Öka farten när det går bra"],
    skills: ["puckHandling"],
    kind: "drill",
    ageMin: 6,
    ageMax: 14,
    minutes: 8,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("cones", 8), perPlayer("pucks")]
  },
  {
    id: "p-protect",
    title: "Skydda pucken i cirkeln",
    description:
      "Två spelare i en tekningscirkel med en puck. Den med pucken skyddar den med kroppen i 20 sekunder, den andra försöker vinna den. Byt roller.",
    coachingPoints: [
      "Kroppen mellan motståndaren och pucken",
      "Bred position, låg tyngdpunkt",
      "Håll pucken långt från motståndarens klubba"
    ],
    skills: ["puckHandling", "battles"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "half",
    minPlayers: 2,
    equipment: [perPair("pucks")]
  },
  {
    id: "p-drag",
    title: "Dra runt hindret",
    description:
      "Lägg klubbor på isen. Spelarna dribblar mot en klubba, för pucken över eller runt den medan de själva åker runt, och accelererar vidare till nästa.",
    coachingPoints: ["Fånga pucken med bladet i draget", "Finta med axlarna före draget", "Fart ut efter hindret"],
    skills: ["puckHandling"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("sticksOnIce", 4), perPlayer("pucks")]
  },

  // ── Passning ────────────────────────────────────────────────
  {
    id: "pa-gates",
    title: "Passa genom portarna",
    description:
      "Konportar (två koner, en meter isär) utspridda i zonen. Paren åker runt och passar genom så många portar de hinner på 45 sekunder.",
    coachingPoints: ["Titta på kompisen innan du passar", "Passa dit kompisen är på väg", "Mottagaren: klubban på isen som mål"],
    skills: ["passing"],
    kind: "drill",
    ageMin: 6,
    ageMax: 11,
    minutes: 6,
    iceArea: "station",
    minPlayers: 2,
    equipment: [n("cones", 8), perPair("pucks")]
  },
  {
    id: "pa-moving",
    title: "Passningar i rörelse",
    description:
      "Paren åker parallellt längs isen, 4–5 meter isär, och passar fram och tillbaka. Tillbaka längs andra sidan. Varianter: bara backhand, eller lyftad passning.",
    coachingPoints: ["Passa framför mottagaren – led passningen", "Ta emot vid sidan av kroppen", "Håll farten genom passningen"],
    skills: ["passing", "skating"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 8,
    iceArea: "full",
    minPlayers: 2,
    equipment: [perPair("pucks")]
  },
  {
    id: "pa-triangle",
    title: "Passningstriangel",
    description:
      "Tre spelare vid var sin kon i en triangel. Passa medsols, efter 30 sekunder motsols. Variant: åk efter passningen till nästa kon.",
    coachingPoints: ["Rikta bladet mot mottagaren när du passat", "Snabbt från mottagning till passning", "Prata – ropa namn"],
    skills: ["passing"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 3,
    equipment: [n("cones", 3), n("pucks", 3)]
  },
  {
    id: "pa-givego",
    title: "Ge och gå",
    description:
      "Spelare A åker med puck mot spelare B som står vid blålinjen. A passar till B, accelererar förbi och får tillbaka pucken. Avsluta med skott. Rotera: A blir B.",
    coachingPoints: ["Passa och öka farten direkt", "B: passa framför A – in i farten", "A: klubban redo att ta emot"],
    skills: ["passing", "gameSense"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 4,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "pa-breakout",
    title: "Uppspel från hörnet",
    description:
      "Back hämtar en puck i hörnet och passar till en forward vid sargen på egen blålinje. Forwarden tar emot i rörelse och åker ut ur zonen.",
    coachingPoints: [
      "Backen: titta upp innan du tar pucken",
      "Forwarden: klubban på isen, kroppen öppen mot planen",
      "Ta emot och åk – stå inte still"
    ],
    skills: ["passing", "gameSense"],
    kind: "drill",
    ageMin: 12,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 4,
    equipment: [n("pucks", 20)]
  },

  // ── Skott ───────────────────────────────────────────────────
  {
    id: "sh-wrist",
    title: "Handledsskott mot mål",
    description:
      "Spelarna står i en båge 6–8 meter från mål, var och en med puckar. Skjut handledsskott en i taget på tränarens signal. Sikta på hörnen.",
    coachingPoints: [
      "Pucken börjar vid bakre foten",
      "Vikten flyttas från bakre till främre benet",
      "Följ igenom – bladet pekar dit du siktar"
    ],
    skills: ["shooting"],
    kind: "drill",
    ageMin: 7,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 1,
    equipment: [n("pucks", 30), n("goals", 1)]
  },
  {
    id: "sh-dribble",
    title: "Dribbla och skjut",
    description:
      "Spelarna dribblar slalom genom fyra koner och avslutar med skott från slottet. Två led, varannan från varje sida.",
    coachingPoints: ["Titta upp mot målet före skottet", "Skjut i farten – stanna inte", "Följ upp på returen"],
    skills: ["shooting", "puckHandling"],
    kind: "drill",
    ageMin: 7,
    ageMax: 16,
    minutes: 8,
    iceArea: "half",
    minPlayers: 2,
    equipment: [n("cones", 4), n("pucks", 30), n("goals", 1)]
  },
  {
    id: "sh-rebounds",
    title: "Returer framför mål",
    description:
      "Tränaren skjuter från blålinjen. Två spelare framför mål försöker styra pucken eller ta returen. Byt par efter fem skott.",
    coachingPoints: [
      "Klubban på isen framför mål",
      "Läs var returen hamnar – var först dit",
      "Snabbt avslut – inga extra dribblingar"
    ],
    skills: ["shooting", "battles"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 2,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "sh-backhand",
    title: "Backhandskott",
    description:
      "Spelarna åker mot mål med pucken på backhand och skjuter backhandskott från nära håll. Variant: finta till forehand, dra tillbaka till backhand och skjut.",
    coachingPoints: [
      "Pucken vid bakre foten på backhandsidan",
      "Lyft med handleden – rulla bladet",
      "Följ igenom högt för att få upp pucken"
    ],
    skills: ["shooting"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "sh-passshot",
    title: "Passning och skott från slottet",
    description:
      "En spelare i hörnet passar till en spelare som åker in i slottet. Skott direkt eller efter mottagning. Passaren ställer sig sist i skottkön.",
    coachingPoints: [
      "Skytten: klubban på isen – visa var du vill ha den",
      "Passaren: passa framför skytten",
      "Skjut snabbt – direktskott om det går"
    ],
    skills: ["shooting", "passing"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 4,
    equipment: [n("pucks", 30), n("goals", 1)]
  },

  // ── Spel och spelförståelse ─────────────────────────────────
  {
    id: "g-3v3",
    title: "3 mot 3 i zonen",
    description:
      "Två lag om tre spelare i en zon med två småmål. Byt lag var 60–90:e sekund. Tränaren spelar in en ny puck direkt när en puck försvinner.",
    coachingPoints: [
      "Hitta fri yta – stå inte bredvid pucken",
      "Pucken framåt – mot mål",
      "Tappar ni pucken: jaga tillbaka direkt"
    ],
    skills: ["gameSense", "battles"],
    kind: "game",
    ageMin: 7,
    ageMax: 20,
    minutes: 10,
    iceArea: "third",
    minPlayers: 6,
    equipment: [n("pinnies", 6), n("smallNets", 2), n("pucks", 10)]
  },
  {
    id: "g-crossice",
    title: "Spel på tvären",
    description:
      "Isen delas på tvären i tre zoner. I varje zon spelar man 3 mot 3 eller 4 mot 4 med småmål. Många puckkontakter för alla.",
    coachingPoints: [
      "Alla ska få röra pucken – spela till varandra",
      "Beröm försöken, inte bara målen",
      "Korta byten – byt ofta"
    ],
    skills: ["gameSense", "puckHandling"],
    kind: "game",
    ageMin: 5,
    ageMax: 10,
    minutes: 12,
    iceArea: "full",
    minPlayers: 6,
    equipment: [n("smallNets", 4), n("pinnies", 8), n("pucks", 10)]
  },
  {
    id: "g-4nets",
    title: "Fyra småmål",
    description:
      "Två lag, fyra småmål – ett i varje hörn av halvplanen. Varje lag anfaller två mål och försvarar två. Byt mål ofta.",
    coachingPoints: ["Byt anfallsriktning när det är trångt", "Läs var det är tomt", "Prata – ropa på pucken"],
    skills: ["gameSense", "passing"],
    kind: "game",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 8,
    equipment: [n("smallNets", 4), n("pinnies", 8), n("pucks", 10)]
  },
  {
    id: "g-keepaway",
    title: "Behåll pucken 3 mot 2",
    description:
      "Tre anfallare försöker behålla pucken i en avgränsad yta mot två försvarare i 30 sekunder. Försvararna vinner om de får ut pucken ur ytan.",
    coachingPoints: [
      "Skapa passningsvinklar – tänk triangel",
      "Spelaren utan puck rör sig hela tiden",
      "Försvarare: stäng passningsvägen med klubban"
    ],
    skills: ["gameSense", "passing"],
    kind: "game",
    ageMin: 10,
    ageMax: 20,
    minutes: 8,
    iceArea: "third",
    minPlayers: 5,
    equipment: [n("pinnies", 4), n("pucks", 10), n("cones", 4)]
  },
  {
    id: "g-2v1",
    title: "2 mot 1 från rödlinjen",
    description:
      "Två anfallare startar vid rödlinjen med puck mot en back som startar på blålinjen. Avsluta på mål. Rotera så att alla får vara back.",
    coachingPoints: [
      "Puckföraren: åk mot backen för att dra till sig hen",
      "Den andra: håll bredden och klubban redo",
      "Backen: ta bort passningen, låt skottet komma från dålig vinkel"
    ],
    skills: ["gameSense", "passing", "shooting"],
    kind: "game",
    ageMin: 10,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 6,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "g-1v1corner",
    title: "1 mot 1 från hörnet",
    description:
      "Tränaren lägger en puck i hörnet. En anfallare och en back startar samtidigt från var sin tekningspunkt. Den som vinner pucken försöker göra mål, den andra försvarar.",
    coachingPoints: ["Vinn de första kliven", "Kroppen före pucken – skydda den", "Backen: håll dig mellan anfallaren och målet"],
    skills: ["battles", "gameSense"],
    kind: "game",
    ageMin: 10,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 2,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "g-relay",
    title: "Stafett med puck",
    description:
      "Lag om tre–fyra spelare i led. Dribbla runt konen och tillbaka, lämna över pucken till nästa. Variant: baklänges ut, framlänges tillbaka.",
    coachingPoints: ["Pucken under kontroll i svängen", "Lämna pucken på isen vid överlämningen", "Heja på laget!"],
    skills: ["puckHandling", "skating"],
    kind: "game",
    ageMin: 5,
    ageMax: 12,
    minutes: 6,
    iceArea: "half",
    minPlayers: 6,
    equipment: [n("pucks", 4), n("cones", 4)]
  },
  {
    id: "g-nest",
    title: "Tömma boet",
    description:
      "Fyra lag med varsitt ”bo” (ett däck) i zonens hörn, puckar i mitten. På signal hämtar spelarna en puck i taget till sitt bo. När mitten är tom får man ta från andras bon. Stopp efter 60 sekunder – flest puckar vinner.",
    coachingPoints: ["Pucken på klubban – inte sparkad", "Huvudet uppe – akta kompisarna", "Snabba vändningar vid boet"],
    skills: ["puckHandling", "skating"],
    kind: "game",
    ageMin: 5,
    ageMax: 10,
    minutes: 6,
    iceArea: "third",
    minPlayers: 8,
    equipment: [n("pucks", 20), n("tires", 4)]
  },

  // ── Närkamp och försvar ─────────────────────────────────────
  {
    id: "b-gap",
    title: "Gapkontroll 1 mot 1",
    description:
      "Back startar vid blålinjen, anfallare med puck vid rödlinjen. Backen åker baklänges, håller rätt avstånd till anfallaren och styr ut hen mot sargen.",
    coachingPoints: [
      "Ögonen på anfallarens bröst, inte på pucken",
      "Klubban på isen framför dig",
      "Styr ut mot sargen – stäng mitten"
    ],
    skills: ["battles", "skating"],
    kind: "drill",
    ageMin: 11,
    ageMax: 20,
    minutes: 8,
    iceArea: "half",
    minPlayers: 2,
    equipment: [n("pucks", 20), n("goals", 1)]
  },
  {
    id: "b-stick",
    title: "Vinn pucken med klubban",
    description:
      "I par i en liten ruta: en dribblar lugnt, den andra försöker vinna pucken med klubbpetning eller klubblyft – utan att slå. Byt efter 20 sekunder.",
    coachingPoints: [
      "Peta med bladet – inga slag",
      "Klubblyft: in under motståndarens klubba, lyft, ta pucken",
      "Behåll balansen – sträck inte för långt"
    ],
    skills: ["battles"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPair("pucks"), n("cones", 4)]
  },

  // ── Målvakt ─────────────────────────────────────────────────
  {
    id: "gk-stance",
    title: "Målvakt: grundposition och T-push",
    description:
      "Målvakten startar i grundposition på målgårdens topp. T-push till höger stolpe, tillbaka till mitten, sedan till vänster. Stanna i full grundposition efter varje förflyttning.",
    coachingPoints: [
      "Vikten på framdelen av skenorna",
      "Händerna framför kroppen och synliga",
      "Huvudet stilla, blicken på pucken"
    ],
    skills: ["goalie"],
    kind: "drill",
    ageMin: 7,
    ageMax: 20,
    minutes: 8,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("goals", 1)]
  },
  {
    id: "gk-butterfly",
    title: "Målvakt: butterfly och upp",
    description:
      "Från grundposition: ner i butterfly, upp igen, förflytta och ner. Tränaren avslutar med att skjuta lågt i varje butterfly.",
    coachingPoints: ["Knäna ihop, benskydden täcker isen", "Händerna fram – inte ner i isen", "Kom i balans innan nästa rörelse"],
    skills: ["goalie"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("pucks", 10), n("goals", 1)]
  },
  {
    id: "gk-tracking",
    title: "Målvakt: följ pucken",
    description:
      "Två–tre spelare passar pucken i en båge framför mål. Målvakten förflyttar sig och står hela tiden vinklad mot pucken. Spelarna skjuter när tränaren ropar.",
    coachingPoints: [
      "Rätt vinkel: mellan pucken och målets mitt",
      "Förflytta medan passningen är på väg",
      "Stå still i skottögonblicket"
    ],
    skills: ["goalie"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 6,
    iceArea: "station",
    minPlayers: 3,
    equipment: [n("pucks", 10), n("goals", 1)]
  }
];

export const SEED_DRILLS: Drill[] = seed.map((d) => ({ ...d, visibility: "public", source: "seed" }));
