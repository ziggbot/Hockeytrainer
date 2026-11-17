import type { Drill, EquipmentNeed } from "../../domain/types";

// Seed drill library for floorball. Own content only — not copied from
// Svensk Innebandy's övningsbank or club material. A starting point that a
// club coach should read through before the pilot.
//
// Areas on a 40 × 20 m court: "full", "half" (20 × 20) and "station" (a
// quarter, 20 × 10 — four stations fill the hall).

type SeedDrill = Omit<Drill, "visibility" | "source">;

const perPlayer = (item: EquipmentNeed["item"]): EquipmentNeed => ({ item, count: "perPlayer" });
const perPair = (item: EquipmentNeed["item"]): EquipmentNeed => ({ item, count: "perPair" });
const n = (item: EquipmentNeed["item"], count: number): EquipmentNeed => ({ item, count });

const seed: SeedDrill[] = [
  // ── Uppvärmning ─────────────────────────────────────────────
  {
    // Fixed first part of every planned session (see the pack's shape).
    id: "ib-w-legs",
    title: "Hoppa, landa, stanna",
    description:
      "Skadeförebyggande start. Alla på en linje med två meter mellan sig. Hoppa framåt på två ben och landa mjukt, åtta gånger. Hoppa på ett ben och stå still i landningen i två sekunder, fem per ben. Sidohopp över linjen, tio gånger. Avsluta med korta spurter där man bromsar på ett ben och vänder.",
    coachingPoints: ["Knät rakt över foten – inte inåt", "Landa mjukt och tyst", "Rak rygg, blicken framåt"],
    skills: ["movement"],
    kind: "warmup",
    ageMin: 6,
    ageMax: 20,
    minutes: 5,
    iceArea: "half",
    minPlayers: 1,
    equipment: []
  },
  {
    id: "ib-w-tag",
    title: "Bollkull",
    description:
      "Alla driver en boll på halvplan. Två–tre tagare i västar driver också boll och kullar med handen. Den som blir kullad byter väst med tagaren. Bollen ska följa med hela tiden.",
    coachingPoints: ["Bollen nära bladet", "Huvudet uppe – se var tagarna är", "Korta, snabba steg vid vändningar"],
    skills: ["ballControl", "movement"],
    kind: "warmup",
    ageMin: 6,
    ageMax: 12,
    minutes: 5,
    iceArea: "half",
    minPlayers: 6,
    equipment: [perPlayer("balls"), n("pinnies", 3)]
  },
  {
    id: "ib-w-follow",
    title: "Följ ledaren med boll",
    description:
      "Två och två, båda med boll. Den främre leder och byter riktning, tempo och sätt att driva. Den bakre gör likadant. Byt ledare på tränarens signal.",
    coachingPoints: [
      "Bollen kvar på bladet i svängarna",
      "Titta på ledaren, inte på bollen",
      "Variera: forehand, backhand, sicksack"
    ],
    skills: ["ballControl", "movement"],
    kind: "warmup",
    ageMin: 6,
    ageMax: 16,
    minutes: 5,
    iceArea: "half",
    minPlayers: 2,
    equipment: [perPlayer("balls")]
  },
  {
    id: "ib-w-colors",
    title: "Färgkoner",
    description:
      "Koner i fyra färger utspridda på halvplan. Alla driver boll i mitten. Tränaren ropar en färg – alla driver runt en kon i den färgen och tillbaka till mitten. Ropa två färger för de äldre.",
    coachingPoints: ["Lyssna – sedan iväg", "Bollen nära i vändningen runt konen", "Akta kompisarna"],
    skills: ["ballControl", "movement"],
    kind: "warmup",
    ageMin: 6,
    ageMax: 10,
    minutes: 5,
    iceArea: "half",
    minPlayers: 4,
    equipment: [perPlayer("balls"), n("cones", 12)]
  },
  {
    id: "ib-w-passwarm",
    title: "Passningsvärmning i par",
    description:
      "Två och två mitt emot varandra, fem meter isär. Passa forehand och backhand. Efter två minuter: rör er i sidled medan ni passar, och öka avståndet.",
    coachingPoints: ["Mjuk mottagning – bladet ger efter", "Passa längs golvet", "Rör fötterna, inte bara klubban"],
    skills: ["passing", "movement"],
    kind: "warmup",
    ageMin: 8,
    ageMax: 20,
    minutes: 5,
    iceArea: "half",
    minPlayers: 2,
    equipment: [perPair("balls")]
  },
  {
    id: "ib-w-ladder",
    title: "Fotarbete i stegen",
    description:
      "Koordinationsstege på golvet. Snabba fötter: ett steg i varje ruta, två steg i varje ruta, i sidled och in-in-ut-ut. Efter stegen: spurta fem meter till en boll och driv tillbaka.",
    coachingPoints: ["Snabba, lätta fötter", "Armarna hjälper till", "Kvalitet före fart"],
    skills: ["movement"],
    kind: "warmup",
    ageMin: 8,
    ageMax: 20,
    minutes: 5,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("ladder", 2), n("balls", 6)]
  },

  // ── Bollkontroll ────────────────────────────────────────────
  {
    id: "ib-b-slalom",
    title: "Slalom mellan koner",
    description:
      "Åtta koner på rad med en och en halv meter emellan. Driv bollen i slalom genom konerna och tillbaka längs sidan. Nästa varv: bara backhand, sedan med huvudet uppe.",
    coachingPoints: ["Bollen nära bladet", "Små, snabba tryck på bollen", "Böj på knäna"],
    skills: ["ballControl"],
    kind: "drill",
    ageMin: 6,
    ageMax: 14,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [perPlayer("balls"), n("cones", 8)]
  },
  {
    id: "ib-b-ownspace",
    title: "Egen ruta",
    description:
      "Varje spelare har en egen ruta på två gånger två meter. Många tryck på bollen: framåt–bakåt, sida–sida, åttor runt fötterna. Tränaren visar en ny rörelse var trettionde sekund.",
    coachingPoints: ["Mjuka händer", "Bollen ska inte lämna rutan", "Titta upp mellan trycken"],
    skills: ["ballControl"],
    kind: "drill",
    ageMin: 6,
    ageMax: 12,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [perPlayer("balls"), n("cones", 16)]
  },
  {
    id: "ib-b-turns",
    title: "Vändningar vid konen",
    description:
      "Driv fram till en kon tio meter bort, vänd och driv tillbaka. Byt vändning varje varv: forehand runt konen, backhand runt konen, och dra bollen bakåt och vänd.",
    coachingPoints: ["Bromsa in före konen", "Kroppen mellan konen och bollen", "Upp i fart direkt efter vändningen"],
    skills: ["ballControl", "movement"],
    kind: "drill",
    ageMin: 7,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [perPlayer("balls"), n("cones", 6)]
  },
  {
    id: "ib-b-headsup",
    title: "Huvudet uppe",
    description:
      "Alla driver boll inne i en avgränsad ruta. Tränaren håller upp ett antal fingrar eller en kon i en färg – spelarna ropar svaret utan att tappa bollen.",
    coachingPoints: ["Känn bollen, titta på tränaren", "Små tryck, inte stora slag", "Hitta fri yta"],
    skills: ["ballControl", "gameSense"],
    kind: "drill",
    ageMin: 8,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPlayer("balls"), n("cones", 4)]
  },
  {
    id: "ib-b-protect",
    title: "Skydda bollen",
    description:
      "Två och två i en ruta på fem gånger fem meter. Den ena har bollen och skyddar den med kroppen i tjugo sekunder, den andra försöker peta bort den. Byt roll.",
    coachingPoints: [
      "Kroppen mellan motståndaren och bollen",
      "Låga höfter, bred stans",
      "Bollen på den sida som är längst bort"
    ],
    skills: ["ballControl", "defence"],
    kind: "drill",
    ageMin: 9,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPair("balls"), n("cones", 8)]
  },
  {
    id: "ib-b-speed",
    title: "Driva i fart",
    description:
      "Rader längs ena kortsidan. Driv bollen i full fart till en kon femton meter bort, bromsa in, kontrollera bollen och driv tillbaka på andra sidan. Nästa i raden går när föregående vänder.",
    coachingPoints: ["Bollen lite framför kroppen i fart", "Bromsa med små steg", "Huvudet uppe när du kan"],
    skills: ["ballControl", "movement"],
    kind: "drill",
    ageMin: 8,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 4,
    equipment: [perPlayer("balls"), n("cones", 6)]
  },

  // ── Passning och mottagning ────────────────────────────────
  {
    id: "ib-p-pairs",
    title: "Passning i par",
    description:
      "Två och två, sex till åtta meter isär. Först stillastående: tio forehand och tio backhand var. Sedan rör ni er åt samma håll och passar under tiden.",
    coachingPoints: [
      "Titta på kompisen innan du passar",
      "Bladet följer bollen mot målet för passningen",
      "Ta emot med mjukt blad"
    ],
    skills: ["passing"],
    kind: "drill",
    ageMin: 6,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPair("balls")]
  },
  {
    id: "ib-p-triangle",
    title: "Passningstriangel",
    description:
      "Tre koner i en triangel med sex meter emellan och en spelare vid varje kon. Passa och spring efter din passning till nästa kon. Byt håll efter en minut.",
    coachingPoints: ["Passa och rör dig direkt", "Visa klubban där du vill ha bollen", "Passa till rätt sida av kompisen"],
    skills: ["passing", "movement"],
    kind: "drill",
    ageMin: 8,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 3,
    equipment: [n("cones", 3), n("balls", 4)]
  },
  {
    id: "ib-p-gates",
    title: "Passa genom portar",
    description:
      "Portar av två koner utspridda i ytan. Två och två försöker passa genom så många portar som möjligt på sextio sekunder. Samma port får inte användas två gånger i rad.",
    coachingPoints: [
      "Kommunicera – vilken port är nästa?",
      "Driv bollen till ett bra läge innan passningen",
      "Mottagaren rör sig mot en ny port"
    ],
    skills: ["passing", "gameSense"],
    kind: "drill",
    ageMin: 7,
    ageMax: 14,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPair("balls"), n("cones", 12)]
  },
  {
    id: "ib-p-givego",
    title: "Väggspel och avslut",
    description:
      "Spelare A driver mot B, passar till B och springer förbi. B spelar tillbaka bollen framför A, som avslutar i småmålet. A tar B:s plats.",
    coachingPoints: ["Passa och sprinta direkt", "Väggen spelar bollen framför löparen", "Avsluta utan att stanna"],
    skills: ["passing", "shooting"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 3,
    equipment: [n("balls", 8), n("smallNets", 1)]
  },
  {
    id: "ib-p-receive",
    title: "Mottagning i rörelse",
    description:
      "En passare vid sidan spelar bollar i olika fart. Spelaren kommer i rörelse, tar emot och driver vidare runt en kon. Byt passare efter fem bollar.",
    coachingPoints: ["Möt bollen", "Bladet ger efter i mottagningen", "Första trycket framåt"],
    skills: ["passing", "ballControl"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [n("balls", 10), n("cones", 4)]
  },
  {
    id: "ib-p-long",
    title: "Långa passningar",
    description:
      "Två rader på var sin sida av halvplanen. Passa tvärs över planen till spelaren i den andra raden, som tar emot i rörelse och passar tillbaka till nästa. Den som passat springer till den andra raden.",
    coachingPoints: ["Kraften från benen och överkroppen", "Passa framför mottagaren", "Mottagaren rör sig mot bollen"],
    skills: ["passing"],
    kind: "drill",
    ageMin: 11,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 4,
    equipment: [n("balls", 10)]
  },

  // ── Skott ───────────────────────────────────────────────────
  {
    id: "ib-s-wrist",
    title: "Dragskott från konen",
    description:
      "Spelarna står i rad vid en kon sex–åtta meter från småmålet. Dra bollen från bakom kroppen och skjut. Byt mellan forehand och backhand varannan gång.",
    coachingPoints: [
      "Bollen bakom kroppen när du börjar dra",
      "Tyngden från bakre till främre fot",
      "Bladet pekar mot målet efter skottet"
    ],
    skills: ["shooting"],
    kind: "drill",
    ageMin: 7,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("balls", 12), n("smallNets", 1), n("cones", 2)]
  },
  {
    id: "ib-s-afterpass",
    title: "Skott efter mottagning",
    description:
      "En passare vid sidan av målet spelar ut bollen till skytten, som kommer i rörelse, tar emot och skjuter direkt. Skytten blir passare.",
    coachingPoints: ["Ta emot i skottläge", "Få tryck: ett eller två", "Titta på målet innan du skjuter"],
    skills: ["shooting", "passing"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [n("balls", 12), n("smallNets", 1)]
  },
  {
    id: "ib-s-slap",
    title: "Slagskott",
    description:
      "Bollarna ligger på rad tio meter från målet. Ta sats, slå bollen med en kort uppsving och följ igenom. Byt mellan att skjuta stillastående och efter en kort ansats.",
    coachingPoints: [
      "Kort uppsving – inte över axelhöjd",
      "Träffa golvet strax bakom bollen",
      "Säkerhet: ingen står framför målet"
    ],
    skills: ["shooting"],
    kind: "drill",
    ageMin: 11,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [n("balls", 15), n("goals", 1)]
  },
  {
    id: "ib-s-rebound",
    title: "Returer framför mål",
    description:
      "Tränaren skjuter från distans mot målvakten. Två spelare framför målet försöker ta returerna och göra mål, en försvarare försöker rensa.",
    coachingPoints: ["Klubban i golvet framför målet", "Läs var returen hamnar", "Försvararen: ta bort klubban, inte spelaren"],
    skills: ["shooting", "gameSense"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 3,
    needsGoalie: true,
    equipment: [n("balls", 15), n("goals", 1)]
  },
  {
    id: "ib-s-angle",
    title: "Avslut från snäv vinkel",
    description:
      "Spelaren driver bollen längs sargen mot målet och avslutar från snäv vinkel – mot korta hörnet eller med en passning bakåt till en medspelare som kommer in.",
    coachingPoints: [
      "Läs målvakten innan du väljer",
      "Skjut tidigt eller spela bakåt",
      "Medspelaren kommer in med klubban i golvet"
    ],
    skills: ["shooting", "feints"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    needsGoalie: true,
    equipment: [n("balls", 12), n("goals", 1)]
  },
  {
    id: "ib-s-run",
    title: "Skott i fart",
    description:
      "Start vid mittlinjen. Driv bollen i fart mot målet och avsluta utan att stanna. Nästa startar när föregående passerar konen vid straffpunkten.",
    coachingPoints: ["Bollen framför kroppen", "Skjut i steget", "Följ upp skottet mot målet"],
    skills: ["shooting", "ballControl"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 3,
    needsGoalie: true,
    equipment: [perPlayer("balls"), n("goals", 1), n("cones", 2)]
  },

  // ── Finter och 1 mot 1 ─────────────────────────────────────
  {
    id: "ib-f-cone",
    title: "Fint förbi konen",
    description:
      "Driv mot en kon som står för en försvarare. Finta – med axeln, med ett skottfint eller genom att vända bladet – och passera på andra sidan. Avsluta i småmålet.",
    coachingPoints: ["Fart in mot konen, sedan fint", "Stor kroppsrörelse, liten bollrörelse", "Öka farten direkt efter finten"],
    skills: ["feints", "ballControl"],
    kind: "drill",
    ageMin: 8,
    ageMax: 16,
    minutes: 10,
    iceArea: "station",
    minPlayers: 1,
    equipment: [perPlayer("balls"), n("cones", 4), n("smallNets", 1)]
  },
  {
    id: "ib-f-lane",
    title: "1 mot 1 i korridor",
    description:
      "En korridor fyra meter bred med ett småmål i änden. Anfallaren försöker ta sig förbi försvararen och göra mål. Försvararen vinner om bollen hamnar utanför korridoren. Byt roller.",
    coachingPoints: ["Anfallare: fart och fint", "Försvarare: stå mellan anfallaren och målet", "Försvarare: klubban i golvet"],
    skills: ["feints", "defence"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    equipment: [n("balls", 8), n("cones", 6), n("smallNets", 1)]
  },
  {
    id: "ib-f-2v0",
    title: "2 mot 0 med avslut",
    description:
      "Två spelare startar vid mittlinjen och passar bollen fram och tillbaka mot målet – minst två passningar innan avslut. Nästa par startar när föregående skjutit.",
    coachingPoints: ["Håll bredden", "Passa framför kompisen", "Den utan boll är redo att skjuta"],
    skills: ["passing", "shooting"],
    kind: "drill",
    ageMin: 8,
    ageMax: 16,
    minutes: 10,
    iceArea: "half",
    minPlayers: 4,
    equipment: [n("balls", 10), n("smallNets", 1)]
  },
  {
    id: "ib-f-2v1",
    title: "2 mot 1",
    description:
      "Två anfallare startar vid mittlinjen mot en försvarare och målvakt. Anfallarna försöker göra mål, försvararen tar bort passningen. Rotera så att alla får försvara.",
    coachingPoints: [
      "Bollföraren drar till sig försvararen",
      "Den andra håller sig spelbar",
      "Försvarare: stäng passningen, låt skottet komma från dålig vinkel"
    ],
    skills: ["gameSense", "passing"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 4,
    needsGoalie: true,
    equipment: [n("balls", 10), n("goals", 1)]
  },

  // ── Försvarsspel ────────────────────────────────────────────
  {
    id: "ib-d-mirror",
    title: "Spegeln",
    description:
      "Två och två i en ruta. Först utan boll: försvararen speglar anfallarens rörelser och håller sig mellan anfallaren och en kon som är målet. Sedan med boll i anfallarens klubba.",
    coachingPoints: ["Korta sidsteg, korsa inte fötterna", "Mellan motståndaren och målet", "Klubban i golvet"],
    skills: ["defence", "movement"],
    kind: "drill",
    ageMin: 8,
    ageMax: 16,
    minutes: 5,
    iceArea: "station",
    minPlayers: 2,
    equipment: [perPair("balls"), n("cones", 8)]
  },
  {
    id: "ib-d-lane",
    title: "Stäng passningsvägen",
    description:
      "Tre anfallare mot en försvarare i en ruta. Anfallarna passar, försvararen försöker bryta passningarna med klubban. Den som slår passningen som bryts byter med försvararen.",
    coachingPoints: [
      "Klubban i passningslinjen",
      "Läs bollföraren – vart tittar hen?",
      "Anfallare: rör dig till en ny passningsväg"
    ],
    skills: ["defence", "gameSense"],
    kind: "drill",
    ageMin: 10,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 4,
    equipment: [n("balls", 6), n("cones", 4), n("pinnies", 4)]
  },

  // ── Spel ────────────────────────────────────────────────────
  {
    // The club's fixed station: every rotation has one plain game.
    id: "ib-g-3v3",
    title: "3 mot 3 på kvartsplan",
    description:
      "Gruppen delas i två lag och spelar mot två småmål på en fjärdedel av planen, 20 × 10 m. Inga målvakter. Är gruppen stor spelar man 3 mot 3 med byten var minut. Tränaren har bollar i fickan och spelar in en ny direkt när en boll försvinner.",
    coachingPoints: ["Hitta fri yta", "Bollen framåt – mot mål", "Alla hjälper till att vinna tillbaka bollen"],
    skills: ["gameSense", "feints"],
    kind: "game",
    ageMin: 6,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 4,
    equipment: [n("smallNets", 2), perPair("pinnies"), n("balls", 5)]
  },
  {
    id: "ib-g-halfcourt",
    title: "Spel på halvplan",
    description:
      "Planen delas på mitten och två matcher spelas samtidigt, 3 mot 3 eller 4 mot 4 mot småmål. Byt motståndare efter fem minuter.",
    coachingPoints: ["Alla ska få röra bollen", "Korta byten", "Beröm försöken, inte bara målen"],
    skills: ["gameSense", "ballControl"],
    kind: "game",
    ageMin: 6,
    ageMax: 14,
    minutes: 15,
    iceArea: "full",
    minPlayers: 8,
    equipment: [n("smallNets", 4), n("pinnies", 8), n("balls", 6)]
  },
  {
    id: "ib-g-4goals",
    title: "Fyra mål",
    description: "Två lag på halvplan med ett småmål i varje hörn. Varje lag anfaller två mål och försvarar två. Byt mål ofta.",
    coachingPoints: ["Byt anfallsriktning när det är trångt", "Läs var det är tomt", "Ropa på bollen"],
    skills: ["gameSense", "passing"],
    kind: "game",
    ageMin: 8,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 8,
    equipment: [n("smallNets", 4), n("pinnies", 8), n("balls", 6)]
  },
  {
    id: "ib-g-keepaway",
    title: "Behåll bollen 3 mot 2",
    description:
      "Tre spelare försöker behålla bollen i en avgränsad ruta mot två försvarare i trettio sekunder. Försvararna vinner om de får ut bollen ur rutan.",
    coachingPoints: [
      "Skapa passningsvinklar – tänk triangel",
      "Spelaren utan boll rör sig hela tiden",
      "Försvarare: stäng passningsvägen"
    ],
    skills: ["gameSense", "passing"],
    kind: "game",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 5,
    equipment: [n("pinnies", 4), n("balls", 8), n("cones", 4)]
  },
  {
    id: "ib-g-5v5",
    title: "Match 5 mot 5",
    description:
      "Match på helplan med målvakter. Korta byten, en–två minuter. Tränaren kan stoppa spelet och fråga laget vad som hände – kort, och sedan igång igen.",
    coachingPoints: ["Spela ihop – passa till den som är fri", "Hela laget försvarar", "Byt snabbt och rätt"],
    skills: ["gameSense", "defence"],
    kind: "game",
    ageMin: 9,
    ageMax: 20,
    minutes: 15,
    iceArea: "full",
    minPlayers: 10,
    needsGoalie: true,
    equipment: [n("goals", 2), n("pinnies", 10), n("balls", 6)]
  },
  {
    id: "ib-g-winback",
    title: "Vinn tillbaka",
    description:
      "3 mot 3 på halvplan mot småmål. Laget som tappar bollen har fem sekunder på sig att vinna tillbaka den – lyckas de får de en extrapoäng.",
    coachingPoints: ["Närmaste spelare pressar direkt", "De andra stänger passningarna", "Vinn bollen – spela framåt"],
    skills: ["defence", "gameSense"],
    kind: "game",
    ageMin: 11,
    ageMax: 20,
    minutes: 10,
    iceArea: "half",
    minPlayers: 6,
    equipment: [n("smallNets", 2), n("pinnies", 6), n("balls", 6)]
  },
  {
    id: "ib-g-empty",
    title: "Töm bollhögen",
    description:
      "Fyra lag med var sin ruta i ett hörn av halvplanen och alla bollar i mitten. På signal driver spelarna en boll i taget till sitt hörn. När mitten är tom får man ta från de andras rutor. Stopp efter sextio sekunder – flest bollar vinner.",
    coachingPoints: ["Driv bollen – inget slag", "Huvudet uppe", "Snabba vändningar"],
    skills: ["ballControl", "movement"],
    kind: "game",
    ageMin: 6,
    ageMax: 10,
    minutes: 5,
    iceArea: "half",
    minPlayers: 8,
    equipment: [n("balls", 20), n("cones", 16)]
  },
  {
    id: "ib-g-relay",
    title: "Stafett med boll",
    description:
      "Lag om tre–fyra i rad. Driv runt konen och tillbaka, lämna bollen till nästa. Varianter: bara backhand, slalom mellan konerna.",
    coachingPoints: ["Bollen under kontroll i svängen", "Lämna bollen still vid överlämningen", "Heja på laget"],
    skills: ["ballControl", "movement"],
    kind: "game",
    ageMin: 6,
    ageMax: 12,
    minutes: 5,
    iceArea: "half",
    minPlayers: 6,
    equipment: [n("balls", 4), n("cones", 4)]
  },
  {
    id: "ib-g-king",
    title: "Kung på plan",
    description:
      "Alla driver boll i en avgränsad yta och försöker peta ut andras bollar samtidigt som de skyddar sin egen. Den som tappar sin boll ur ytan gör ett varv runt ytan och kommer tillbaka.",
    coachingPoints: ["Skydda bollen med kroppen", "Huvudet uppe", "Peta på bollen, inte på klubban"],
    skills: ["ballControl", "defence"],
    kind: "game",
    ageMin: 7,
    ageMax: 14,
    minutes: 5,
    iceArea: "half",
    minPlayers: 6,
    equipment: [perPlayer("balls"), n("cones", 4)]
  },
  {
    id: "ib-g-numbers",
    title: "Nummerspel",
    description:
      "Två lag på var sin långsida, varje spelare har ett nummer. Tränaren spelar ut en boll och ropar ett eller två nummer – de spelarna möts 1 mot 1 eller 2 mot 2 mot småmål.",
    coachingPoints: ["Reagera direkt", "Först till bollen – skydda den", "Avsluta snabbt"],
    skills: ["gameSense", "feints"],
    kind: "game",
    ageMin: 7,
    ageMax: 16,
    minutes: 10,
    iceArea: "half",
    minPlayers: 6,
    equipment: [n("balls", 10), n("smallNets", 2)]
  },

  // ── Målvakt ─────────────────────────────────────────────────
  {
    id: "ib-gk-move",
    title: "Målvakt – förflyttning i sidled",
    description:
      "Målvakten flyttar sig i sidled mellan stolparna i grundposition. En medspelare rullar bollar mot sidorna av målet, målvakten stoppar och rullar tillbaka.",
    coachingPoints: ["Överkroppen stilla, benen jobbar", "Händerna framför kroppen", "Tillbaka till mitten efter varje boll"],
    skills: ["goalie"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 2,
    needsGoalie: true,
    equipment: [n("goals", 1), n("balls", 10)]
  },
  {
    id: "ib-gk-throw",
    title: "Målvakt – fånga och kasta ut",
    description:
      "Skott från olika vinklar. Målvakten fångar eller styr bollen och kastar snabbt ut till en spelare vid sidan, som driver iväg.",
    coachingPoints: ["Fånga med båda händerna", "Titta upp innan kastet", "Kasta längs golvet till spelarens klubba"],
    skills: ["goalie", "passing"],
    kind: "drill",
    ageMin: 9,
    ageMax: 20,
    minutes: 10,
    iceArea: "station",
    minPlayers: 3,
    needsGoalie: true,
    equipment: [n("goals", 1), n("balls", 10)]
  }
];

export const SEED_DRILLS: Drill[] = seed.map((d) => ({ ...d, visibility: "public", source: "seed" }));
