// Starter library written for this app (own content, not copied from federation material).
// Review and extend with the club's coaches before the pilot; see SPEC_hockey.md §9.
export const SEED_DRILLS = [
    {
        key: 'follow-the-leader-puck',
        title: 'Följa John med puck',
        description: 'Spelarna åker i led efter en ledare som byter riktning, tempo och åkstil. Alla har puck.',
        coachingPoints: ['Blicken upp – se ledaren, inte pucken', 'Små, mjuka händer', 'Byt ledare var 45:e sekund'],
        skillTags: ['uppvärmning', 'puckkontroll', 'skridsko'],
        ageMin: 5, ageMax: 12, durationMin: 5, iceArea: 'full', minPlayers: 4,
        equipment: [{ item: 'Puckar', qty: 20 }],
    },
    {
        key: 'tag-game',
        title: 'Kull med västar',
        description: 'Två–tre jagare i väst. Den som blir tagen tar över västen. Begränsa ytan till en zon.',
        coachingPoints: ['Korta, snabba skär', 'Huvudet uppe', 'Ingen tackling – bara klapp med handen'],
        skillTags: ['uppvärmning', 'skridsko'],
        ageMin: 5, ageMax: 10, durationMin: 5, iceArea: 'half', minPlayers: 6,
        equipment: [{ item: 'Västar', qty: 3 }],
    },
    {
        key: 'circles-edges',
        title: 'Kurvåkning runt tekningscirklarna',
        description: 'Spelarna åker runt de fem cirklarna i en slinga, först utan och sedan med puck.',
        coachingPoints: ['Böj knäna – sitt i en stol', 'Tryck med ytterskären', 'Inre axeln lägre i kurvan'],
        skillTags: ['skridsko'],
        ageMin: 6, ageMax: 16, durationMin: 8, iceArea: 'full', minPlayers: 4,
        equipment: [{ item: 'Puckar', qty: 20 }],
    },
    {
        key: 'stop-start',
        title: 'Stopp och start mellan blålinjerna',
        description: 'Åk fullt till blålinjen, stanna med båda skridskorna, starta åt andra hållet. Variera stopp mot vänster och höger.',
        coachingPoints: ['Tyngden över fötterna vid stopp', 'Explosiva första skär', 'Ansiktet mot samma långsida varje gång'],
        skillTags: ['skridsko'],
        ageMin: 5, ageMax: 16, durationMin: 6, iceArea: 'full', minPlayers: 2,
        equipment: [],
    },
    {
        key: 'backward-turns',
        title: 'Baklängesåkning med vändning',
        description: 'Baklänges till kon, vänd framåt (öppna höften) och spurta till nästa kon.',
        coachingPoints: ['C-skär baklänges', 'Vänd på tårna utan att tappa fart', 'Klubban på isen'],
        skillTags: ['skridsko'],
        ageMin: 8, ageMax: 16, durationMin: 8, iceArea: 'half', minPlayers: 4,
        equipment: [{ item: 'Koner', qty: 6 }],
    },
    {
        key: 'cone-slalom',
        title: 'Konslalom med puck',
        description: 'Två rader med koner. Spelarna drar pucken genom slalom och avslutar med en passning till nästa i ledet.',
        coachingPoints: ['Puckens väg bredvid kroppen, inte framför', 'Rulla handlederna', 'Öka tempot när det går bra'],
        skillTags: ['puckkontroll'],
        ageMin: 5, ageMax: 14, durationMin: 8, iceArea: 'station', minPlayers: 3,
        equipment: [{ item: 'Koner', qty: 10 }, { item: 'Puckar', qty: 10 }],
    },
    {
        key: 'obstacle-course',
        title: 'Hinderbana med puck',
        description: 'Bana med koner, klubbor på isen att lyfta pucken över och en kon att åka runt. Avsluta med skott på mål.',
        coachingPoints: ['Behåll pucken nära', 'Lyft pucken med lätt handled', 'Avsluta alltid med skott'],
        skillTags: ['puckkontroll', 'skridsko', 'skott'],
        ageMin: 5, ageMax: 10, durationMin: 10, iceArea: 'half', minPlayers: 4,
        equipment: [{ item: 'Koner', qty: 8 }, { item: 'Klubbor som hinder', qty: 4 }, { item: 'Puckar', qty: 15 }, { item: 'Mål', qty: 1 }],
    },
    {
        key: 'partner-passing',
        title: 'Passningar i par',
        description: 'Två och två med 4–5 meters avstånd. Forehand, backhand och sedan passning i rörelse sida vid sida.',
        coachingPoints: ['Klubbladet som en mottagande mjuk "kopp"', 'Följ igenom mot mottagaren', 'Titta på målet med passningen'],
        skillTags: ['passning'],
        ageMin: 6, ageMax: 14, durationMin: 6, iceArea: 'third', minPlayers: 2,
        equipment: [{ item: 'Puckar', qty: 10 }],
    },
    {
        key: 'three-lane-passing',
        title: 'Passning i tre led',
        description: 'Tre spelare åker i varsin korridor och passar framåt hela banan, avslut på mål.',
        coachingPoints: ['Passa framför mottagaren', 'Håll korridorerna breda', 'Kommunicera – ropa på pucken'],
        skillTags: ['passning', 'samarbete', 'skott'],
        ageMin: 9, ageMax: 16, durationMin: 10, iceArea: 'full', minPlayers: 6,
        equipment: [{ item: 'Puckar', qty: 20 }, { item: 'Mål', qty: 2 }],
    },
    {
        key: 'skate-around-shoot',
        title: 'Åk runt kon och skjut',
        description: 'Spelaren åker runt en kon vid blålinjen, tar emot pass och avslutar på mål.',
        coachingPoints: ['Skott i fart – inte stanna', 'Tyngden från bakre till främre benet', 'Sikta på en hörna'],
        skillTags: ['skott', 'skridsko'],
        ageMin: 7, ageMax: 16, durationMin: 10, iceArea: 'half', minPlayers: 4,
        equipment: [{ item: 'Koner', qty: 2 }, { item: 'Puckar', qty: 25 }, { item: 'Mål', qty: 1 }],
    },
    {
        key: 'rebounds',
        title: 'Retur framför mål',
        description: 'En skjuter från blålinjen, en annan står vid målet och tar returen.',
        coachingPoints: ['Klubban på isen vid mål', 'Läs vart returen tar vägen', 'Snabbt avslut'],
        skillTags: ['skott', 'spelförståelse'],
        ageMin: 9, ageMax: 16, durationMin: 8, iceArea: 'half', minPlayers: 4,
        equipment: [{ item: 'Puckar', qty: 25 }, { item: 'Mål', qty: 1 }],
    },
    {
        key: 'corner-1v1',
        title: '1 mot 1 i hörnan',
        description: 'Tränaren spelar in en puck i hörnan, två spelare tävlar om den och försöker göra mål i ett litet mål.',
        coachingPoints: ['Skydda pucken med kroppen', 'Försvararen: klubban först, kropp mellan motståndare och mål', 'Korta byten – max 30 sekunder'],
        skillTags: ['1mot1', 'puckkontroll'],
        ageMin: 8, ageMax: 16, durationMin: 8, iceArea: 'third', minPlayers: 4,
        equipment: [{ item: 'Puckar', qty: 15 }, { item: 'Små mål', qty: 1 }],
    },
    {
        key: 'two-on-one',
        title: '2 mot 1 från mittzonen',
        description: 'Två anfallare startar vid röd linje mot en back. Anfallarna ska skapa ett avslut.',
        coachingPoints: ['Puckföraren angriper backen', 'Den andra håller passningsvägen öppen', 'Backen: ta passningen, låt skottet gå till målvakten'],
        skillTags: ['spelförståelse', 'passning'],
        ageMin: 10, ageMax: 16, durationMin: 10, iceArea: 'half', minPlayers: 6,
        equipment: [{ item: 'Puckar', qty: 20 }, { item: 'Mål', qty: 1 }],
    },
    {
        key: 'cross-ice-3v3',
        title: 'Smålagsspel 3 mot 3 på tvären',
        description: 'Spel i en zon på tvären med små mål. Korta byten och snabba igångsättningar.',
        coachingPoints: ['Många puckberöringar per spelare', 'Uppmuntra att söka ytor', 'Byt lag var 45:e–60:e sekund'],
        skillTags: ['smålagsspel', 'spelförståelse'],
        ageMin: 5, ageMax: 16, durationMin: 12, iceArea: 'third', minPlayers: 6,
        equipment: [{ item: 'Små mål', qty: 2 }, { item: 'Puckar', qty: 10 }, { item: 'Västar', qty: 6 }],
    },
    {
        key: 'four-corner-stations',
        title: 'Stationsträning i fyra hörn',
        description: 'Fyra stationer i var sin hörna: skridsko, puckkontroll, passning, skott. Byt station på signal.',
        coachingPoints: ['En tränare per station', 'Tydlig signal för byte', 'Max 6 spelare per station'],
        skillTags: ['skridsko', 'puckkontroll', 'passning', 'skott'],
        ageMin: 6, ageMax: 12, durationMin: 20, iceArea: 'station', minPlayers: 8,
        equipment: [{ item: 'Koner', qty: 12 }, { item: 'Puckar', qty: 30 }, { item: 'Små mål', qty: 2 }],
    },
    {
        key: 'goalie-station',
        title: 'Målvaktsstation: förflyttning och räddning',
        description: 'Målvakten förflyttar sig stolpe till stolpe och räddar skott från tränaren på varje position.',
        coachingPoints: ['Grundposition innan skottet', 'Följ pucken med blicken', 'Återhämta snabbt efter räddning'],
        skillTags: ['målvakt'],
        ageMin: 8, ageMax: 16, durationMin: 10, iceArea: 'station', minPlayers: 1,
        equipment: [{ item: 'Mål', qty: 1 }, { item: 'Puckar', qty: 15 }],
    },
];
/** Inserts seed drills that are not already present. Returns the number inserted. */
export async function seedDrills(pool) {
    let inserted = 0;
    for (const d of SEED_DRILLS) {
        const res = await pool.query(`INSERT INTO drills (seed_key, visibility, title, description, coaching_points, skill_tags,
                           age_min, age_max, duration_min, ice_area, min_players, equipment)
       VALUES ($1, 'public', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (seed_key) DO NOTHING`, [d.key, d.title, d.description, d.coachingPoints, d.skillTags, d.ageMin, d.ageMax,
            d.durationMin, d.iceArea, d.minPlayers, JSON.stringify(d.equipment)]);
        inserted += res.rowCount ?? 0;
    }
    return inserted;
}
//# sourceMappingURL=seed.js.map