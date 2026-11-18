import type { Area, DrillKind, EquipmentItem, NoteTag, Skill } from "../domain/types";
import type { LineEnd, LineKind, MarkerKind, SketchColor, SketchSurface } from "../domain/sketch";
import { SPORT_ID, type SportId } from "../sport/id";

// Swedish UI strings (spec §6: Swedish first, i18n-ready). Add en/fi/no by
// creating sibling files with the same shape.

/** The few words that differ between the hockey and floorball apps. */
const BY_SPORT = {
  hockey: {
    clubName: "Färjestad BK",
    icon: "🏒",
    slotTime: "Istid",
    openLive: "Öppna rinkläget",
    areas: { full: "Helplan", half: "Halvplan", third: "Zon", station: "Station" },
    sketch: {
      puck: "Puck",
      pucks: "Puckar",
      withPuck: "Med puck",
      backWithPuck: "Bakåt puck",
      surfaces: { full: "Helplan", half: "Halvplan", zone: "Zon" }
    }
  },
  innebandy: {
    clubName: "Herrhagens Innebandy",
    icon: "🏑",
    slotTime: "Halltid",
    openLive: "Öppna planläget",
    areas: { full: "Helplan", half: "Halvplan", third: "Tredjedel", station: "Kvartsplan" },
    sketch: {
      puck: "Boll",
      pucks: "Bollar",
      withPuck: "Med boll",
      backWithPuck: "Bakåt boll",
      surfaces: { full: "Helplan", half: "Halvplan", zone: "Kvartsplan" }
    }
  }
} satisfies Record<
  SportId,
  {
    clubName: string;
    icon: string;
    slotTime: string;
    openLive: string;
    areas: Record<Area, string>;
    sketch: {
      puck: string;
      pucks: string;
      withPuck: string;
      backWithPuck: string;
      surfaces: Record<SketchSurface, string>;
    };
  }
>;

const T = BY_SPORT[SPORT_ID];

export const sv = {
  skills: {
    skating: "Skridsko",
    puckHandling: "Puckkontroll",
    battles: "Närkamp",
    movement: "Rörelse",
    ballControl: "Bollkontroll",
    feints: "Finter & 1 mot 1",
    defence: "Försvarsspel",
    passing: "Passning",
    shooting: "Skott",
    gameSense: "Spelförståelse",
    goalie: "Målvakt"
  } satisfies Record<Skill, string>,

  skillIcons: {
    skating: "⛸️",
    puckHandling: "🏒",
    battles: "💪",
    movement: "🤸",
    ballControl: "🏑",
    feints: "↪️",
    defence: "🛡️",
    passing: "🔁",
    shooting: "🎯",
    gameSense: "🧠",
    goalie: "🥅"
  } satisfies Record<Skill, string>,

  /** Ice areas in the hockey app, court areas in the floorball app. */
  iceAreas: T.areas satisfies Record<Area, string>,

  kinds: {
    warmup: "Uppvärmning",
    drill: "Övning",
    game: "Spel"
  } satisfies Record<DrillKind, string>,

  equipment: {
    pucks: "Puckar",
    balls: "Bollar",
    cones: "Koner",
    pinnies: "Västar",
    smallNets: "Småmål",
    tires: "Däck",
    sticksOnIce: "Klubbor att lägga på isen",
    goals: "Stora mål",
    boards: "Sargbitar",
    ladder: "Koordinationsstege"
  } satisfies Record<EquipmentItem, string>,

  noteTags: {
    workedWell: "Funkade bra",
    repeat: "Kör igen",
    tooHard: "För svårt",
    tooEasy: "För lätt"
  } satisfies Record<NoteTag, string>,

  weekdays: ["måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag", "söndag"],
  weekdaysShort: ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"],
  months: [
    "januari",
    "februari",
    "mars",
    "april",
    "maj",
    "juni",
    "juli",
    "augusti",
    "september",
    "oktober",
    "november",
    "december"
  ],
  ui: {
    appName: "Tränarappen",
    clubName: T.clubName,
    /** The sport's stick, for practices and the Träna tab. */
    sportIcon: T.icon,
    common: {
      today: "Idag",
      tomorrow: "Imorgon",
      tomorrowShort: "Imon",
      back: "Tillbaka",
      save: "Spara",
      cancel: "Avbryt",
      close: "Stäng",
      delete: "Ta bort",
      edit: "Ändra",
      done: "Klar",
      min: "min",
      minutes: (n: number) => `${n} min`,
      drills: (n: number) => (n === 1 ? "1 övning" : `${n} övningar`),
      years: (a: number, b: number) => `${a}–${b} år`,
      players: (n: number) => `minst ${n} spelare`,
      week: (w: number) => `v. ${w}`,
      weeks: (a: number, b: number) => `v. ${a}–${b}`,
      unknownDrill: "Övningen finns inte längre",
      tapAgain: "Säker? Tryck igen",
      tapAgainDelete: "Tryck igen för att ta bort",
      hour: "timme",
      minute: "minut"
    },
    error: {
      title: "Något gick fel",
      body: "Appen stötte på ett fel på den här sidan. Dina data är kvar. Skicka gärna texten nedan till den som bygger appen.",
      home: "Till startsidan"
    },
    nav: {
      season: "Säsong",
      train: "Träna",
      drills: "Övningar",
      label: "Huvudmeny"
    },
    home: {
      go: "Nu kör vi",
      addTimes: "Lägg till träningstider",
      nextLabel: (when: string) => `Nästa pass · ${when}`,
      showPlan: "Visa och ändra passet",
      thisWeek: "Den här veckan",
      unplanned: "Oplanerat",
      noSlots: "Inga träningstider de närmaste sju dagarna.",
      changeTimes: "Ändra träningstider",
      extra: "Lägg till extrapass",
      findDrill: "Leta övningar",
      footer: "All data stannar på den här enheten.",
      doneCount: (done: number, total: number) => `${done}/${total} pass klara den här veckan`
    },
    extra: {
      title: "Extrapass",
      date: "Dag",
      start: "Starttid",
      length: `${T.slotTime} (minuter)`,
      add: "Lägg till"
    },
    session: {
      plan: "Upplägg",
      editPlan: "Ändra",
      stopEdit: "Klar",
      total: (used: number, slot: number) => `${used} av ${slot} min`,
      over: (n: number) => `${n} min för mycket`,
      under: (n: number) => `${n} min kvar`,
      stations: (n: number, m: number) => `Stationer · ${n} × ${m} min`,
      stationsTitle: "Stationer",
      // Soft hyphen: the big rink title can break the compound at 320 px.
      gather: "Samling och stations\u00ADuppdelning",
      addGather: "Samling",
      closing: "Avslutande samling",
      addClosing: "Avslutning",
      freeZone: "Fri zon i mitten",
      perStation: "min per station",
      swap: "Byt",
      remove: "Ta bort",
      up: "Flytta upp",
      down: "Flytta ner",
      addDrill: "Lägg till övning",
      addStation: "Lägg till station",
      newSuggestion: "Nytt förslag",
      newSuggestionConfirm: "Ersätt upplägget? Tryck igen",
      equipment: "Utrustning",
      noEquipment: "Ingen särskild utrustning behövs.",
      notes: "Anteckningar",
      notePlaceholder: "Hur gick det? Vad tar ni med till nästa pass?",
      addNote: "Spara anteckning",
      share: "Dela passet",
      shareText: (title: string) => `Träningspass: ${title}`,
      copied: "Länken är kopierad",
      markDone: "Markera som klart",
      markPlanned: "Ångra klart",
      done: "Klart ✓",
      deleteSession: "Ta bort passet",
      notFound: "Passet finns inte.",
      emptyPlan: "Upplägget är tomt. Lägg till en övning eller be om ett nytt förslag."
    },
    rink: {
      ready: "Redo",
      start: "Starta passet",
      exit: "Avsluta",
      restart: "Starta om",
      follow: "Följ tiden",
      timeline: "Tidslinje",
      rotation: (r: number, n: number) => `Rotation ${r} av ${n}`,
      thenSwap: "sedan byt station",
      swapIn: (t: string) => `byt om ${t}`,
      group: (g: number) => `Grupp ${g}`,
      upNext: "Sedan",
      finishedTitle: "Bra jobbat!",
      saveAndClose: "Spara och avsluta"
    },
    library: {
      title: "Övningar",
      sub: (n: number) => `${n} övningar`,
      search: "Sök övning …",
      onlyAge: (name: string) => `Bara ${name}`,
      short: "5 min",
      medium: "10 min",
      long: "15+ min",
      none: "Inga övningar matchar filtret.",
      newDrill: "Egen övning",
      drawDrill: "Rita övning",
      own: "Egen"
    },
    drill: {
      coachingPoints: "Coachningspunkter",
      equipment: "Utrustning",
      perPlayer: "1 per spelare",
      perPair: "1 per par",
      addToSession: "Lägg till i pass",
      pickSession: "Vilket pass?",
      noSessions: "Inga planerade pass de närmaste dagarna.",
      added: "Tillagd ✓",
      editOwn: "Ändra övningen",
      deleteOwn: "Ta bort övningen"
    },
    editor: {
      newTitle: "Ny övning",
      editTitle: "Ändra övning",
      name: "Namn",
      description: "Beskrivning",
      points: "Coachningspunkter",
      pointsHint: "En punkt per rad – kort och tydligt.",
      skills: "Färdigheter",
      kind: "Typ",
      ages: "Ålder (år)",
      from: "från",
      to: "till",
      length: "Längd (minuter)",
      area: "Yta",
      minPlayers: "Minsta antal spelare",
      equipment: "Utrustning",
      diagram: "Skiss",
      diagramHint: "Rita övningen, eller fota en whiteboard.",
      removeDiagram: "Ta bort bild",
      draw: "Rita skiss",
      editSketch: "Ändra skiss",
      removeSketch: "Ta bort skiss",
      needName: "Ge övningen ett namn."
    },
    sketch: {
      title: "Rita övning",
      done: "Klar",
      cancel: "Avbryt",
      undo: "Ångra",
      redo: "Gör om",
      remove: "Ta bort",
      clear: "Rensa",
      clearConfirm: "Tryck igen för att rensa",
      rotate: "Vrid",
      smaller: "Mindre",
      larger: "Större",
      move: "Flytta",
      textDefault: "Text",
      textLabel: "Text",
      canvas: "Ritytan",
      surfaces: T.sketch.surfaces satisfies Record<SketchSurface, string>,
      colors: { red: "Röd", blue: "Blå", yellow: "Gul", black: "Svart" } satisfies Record<SketchColor, string>,
      lines: {
        skate: "Åk",
        skateBack: "Åk bakåt",
        puck: T.sketch.withPuck,
        puckBack: T.sketch.backWithPuck,
        pass: "Pass",
        shot: "Skott"
      } satisfies Record<LineKind, string>,
      ends: { arrow: "Pil", stop: "Stopp", none: "Ingen" } satisfies Record<LineEnd, string>,
      markers: {
        player: "Spelare",
        coach: "Tränare",
        puck: T.sketch.puck,
        pucks: T.sketch.pucks,
        cone: "Kon",
        tire: "Däck",
        net: "Mål",
        smallNet: "Litet mål",
        obstacle: "Hinder",
        zone: "Skottzon",
        text: "Text"
      } satisfies Record<MarkerKind, string>,
      goalie: "Målvakt",
      coachLabel: "Tr",
      noLabel: "–"
    },
    season: {
      title: "Säsongen",
      sub: (ag: string, n: number) => `${ag} · ${n} block`,
      philosophy: "Så tränar vi",
      gameFormat: "Spelform",
      blocks: "Säsongsblock",
      now: (i: number, n: number) => `Nu · vecka ${i} av ${n}`,
      coverage: (done: number) => (done === 1 ? "1 pass klart" : `${done} pass klara`),
      editBlock: "Ändra block",
      name: "Namn",
      startWeek: "Startvecka",
      endWeek: "Slutvecka",
      focus: "Fokus (1–2)",
      recent: "Senaste passen",
      noRecent: "Inga genomförda pass än."
    },
    team: {
      title: "Laget",
      coachName: "Ditt namn",
      name: "Lagets namn",
      namePlaceholder: "t.ex. U10 Blå",
      ageGroup: "Åldersgrupp",
      players: "Antal spelare (ungefär)",
      playersHint: "Bara antal, inga namn.",
      times: "Träningstider",
      addTime: "Lägg till tid",
      day: "Dag",
      start: "Start",
      length: T.slotTime,
      otherTeams: "Mina lag",
      switchTo: "Byt",
      active: "Aktivt",
      newTeam: "Nytt lag",
      deleteTeam: "Ta bort laget",
      data: "Data",
      dataNote: "Allt sparas på den här enheten. Ta en säkerhetskopia ibland.",
      export: "Spara säkerhetskopia",
      import: "Läs in säkerhetskopia",
      importDone: "Säkerhetskopian är inläst.",
      importFailed: "Filen kunde inte läsas.",
      importConfirm: "Ersätta allt på den här enheten med säkerhetskopian?",
      importReplace: "Ja, ersätt allt"
    },
    manage: {
      title: "Hantera lag",
      intro: "Skapa ett konto så kan du bjuda in dina medtränare. Laget sparas då också i molnet.",
      createAccount: "Skapa konto",
      login: "Logga in",
      haveAccount: "Har du redan ett konto? Logga in",
      noAccount: "Inget konto? Skapa ett",
      name: "Ditt namn",
      email: "E-post",
      password: "Lösenord",
      passwordHint: "Minst 8 tecken.",
      coaches: "Tränare",
      roles: { head: "Huvudtränare", coach: "Tränare" },
      you: "du",
      invite: "Bjud in tränare",
      shareTitle: (team: string) => `${team} i Tränarappen`,
      shareText: (from: string, team: string) => `${from} bjuder in dig som tränare i ${team}:`,
      inviteReady: "Länken gäller i 7 dagar för upp till 10 tränare.",
      copy: "Kopiera länk",
      copied: "Kopierad",
      openLinks: "Öppna inbjudningar",
      linkUses: (n: number, max: number) => `${n} av ${max} har gått med · gäller till`,
      closeLink: "Stäng",
      makeHead: "Gör till huvudtränare",
      makeCoach: "Gör till tränare",
      remove: "Ta bort",
      removeConfirm: "Tryck igen för att ta bort",
      resetLink: "Nytt lösenord",
      resetReady: (h: number) => `Skicka länken till tränaren. Den fungerar en gång i ${h} timmar.`,
      leave: "Lämna laget",
      leaveConfirm: "Tryck igen för att lämna",
      deleteForAll: "Ta bort laget för alla",
      signedInAs: (name: string) => `Inloggad som ${name}`,
      logout: "Logga ut",
      synced: (time: string) => `Synkat ${time}`,
      syncing: "Synkar …",
      offline: "Ingen anslutning. Synkar när nätet är tillbaka.",
      failed: "Något gick fel. Försök igen.",
      connecting: "Ansluter … första gången kan ta en minut.",
      notAvailable: "Lagdelning finns i appen, inte i förhandsversionen.",
      joinTitle: "Inbjudan",
      joinText: (from: string, team: string, role: string) => `${from} bjuder in dig som ${role.toLowerCase()} i ${team}.`,
      join: "Gå med i laget",
      joinInvalid: "Länken har gått ut eller stängts. Be huvudtränaren om en ny.",
      otherSport: "Länken gäller den andra appen. Öppna den i rätt app.",
      newPasswordTitle: "Nytt lösenord",
      newPasswordFor: (name: string) => `Välj ett nytt lösenord för ${name}.`,
      savePassword: "Spara lösenord",
      resetInvalid: "Länken har gått ut eller redan använts.",
      coCoachDrill: "Från medtränare"
    },
    onboarding: {
      hello: "Hej tränare.",
      sub: "Allt går att ändra sen.",
      days: "Vilka dagar tränar ni?",
      start: "Starttid",
      length: `${T.slotTime} (minuter)`,
      go: "Klart – nu kör vi",
      needName: "Skriv lagets namn.",
      needDay: "Välj minst en dag."
    },
    shared: {
      title: "Delat pass",
      readOnly: "Skrivskyddad vy.",
      broken: "Länken är trasig eller ofullständig. Be tränaren dela passet igen.",
      openRink: T.openLive
    }
  }
};

export type Strings = typeof sv;
