import type { DrillKind, EquipmentItem, IceArea, NoteTag, Skill } from "../domain/types";

// Swedish UI strings (spec §6: Swedish first, i18n-ready). Add en/fi/no by
// creating sibling files with the same shape.

export const sv = {
  skills: {
    skating: "Skridsko",
    puckHandling: "Puckkontroll",
    passing: "Passning",
    shooting: "Skott",
    gameSense: "Spelförståelse",
    battles: "Närkamp",
    goalie: "Målvakt"
  } satisfies Record<Skill, string>,

  skillIcons: {
    skating: "⛸️",
    puckHandling: "🏒",
    passing: "🔁",
    shooting: "🎯",
    gameSense: "🧠",
    battles: "💪",
    goalie: "🥅"
  } satisfies Record<Skill, string>,

  iceAreas: {
    full: "Helplan",
    half: "Halvplan",
    third: "Zon",
    station: "Station"
  } satisfies Record<IceArea, string>,

  kinds: {
    warmup: "Uppvärmning",
    drill: "Övning",
    game: "Spel"
  } satisfies Record<DrillKind, string>,

  equipment: {
    pucks: "Puckar",
    cones: "Koner",
    pinnies: "Västar",
    smallNets: "Småmål",
    tires: "Däck",
    sticksOnIce: "Klubbor att lägga på isen",
    goals: "Stora mål"
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
      hello: "Hej tränare.",
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
      length: "Istid (minuter)",
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
      exit: "Avsluta",
      step: (i: number, n: number) => `${i} av ${n}`,
      tapStart: "Tryck för att starta",
      tapPause: "Tryck för att pausa",
      paused: "Pausad – tryck för att fortsätta",
      timeUp: "Tid! Nästa övning →",
      timeUpStations: "Tid! Byt station →",
      prev: "◀",
      next: "Nästa ▶",
      finish: "Klart ▶",
      rotation: (r: number, n: number) => `Rotation ${r} av ${n}`,
      group: (g: number) => `Grupp ${g}`,
      station: (l: string) => `Station ${l}`,
      allStations: "Alla stationer",
      upNext: "Sedan",
      finishedTitle: "Bra jobbat!",
      finishedSub: "Skriv en rad medan du minns – det hjälper nästa pass.",
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
      diagram: "Skiss (bild)",
      diagramHint: "Fota en whiteboard eller ladda upp en bild.",
      removeDiagram: "Ta bort bild",
      needName: "Ge övningen ett namn."
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
      name: "Lagets namn",
      namePlaceholder: "t.ex. U10 Blå",
      ageGroup: "Åldersgrupp",
      players: "Antal spelare (ungefär)",
      playersHint: "Bara antal, inga namn.",
      times: "Träningstider",
      addTime: "Lägg till tid",
      day: "Dag",
      start: "Start",
      length: "Istid",
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
    onboarding: {
      hello: "Hej tränare.",
      sub: "Allt går att ändra sen.",
      days: "Vilka dagar tränar ni?",
      start: "Starttid",
      length: "Istid (minuter)",
      go: "Klart – nu kör vi",
      needName: "Skriv lagets namn.",
      needDay: "Välj minst en dag."
    },
    shared: {
      title: "Delat pass",
      readOnly: "Skrivskyddad vy.",
      broken: "Länken är trasig eller ofullständig. Be tränaren dela passet igen.",
      openRink: "Öppna rinkläget"
    }
  }
};

export type Strings = typeof sv;
