# Tränarappen Innebandy — floorball variant

The floorball version of Tränarappen for Herrhagens Innebandy. Same app, same code base (see `docs/decisions/0003-sport-packs.md`); this file covers what is specific to floorball. Everything in `SPEC_hockey.md` about privacy (no player data), EU hosting, offline use and own content applies here too.

## Research summary (October 2026)

Svensk Innebandy's own pages (innebandy.se) were blocked from the build environment, so the federation material below comes from search excerpts and club documents that quote it. Verify against the federation or the district before relying on it.

- **SIU — Svensk Innebandys utvecklingsmodell.** Levels by colour: light green "Lek och rörelse" (0–6), green "Rörelseglädje" (6–9: joy, basic motor skills, stick technique through play), blue "Lära sig träna" (9–12: dribbling, passing and shooting technique), red "Träna för att träna" (about 12–16). Sources disagree on six vs. eight levels; clubs draw the age lines differently.
- **Match formats for children** (club guidelines quoting the federation): green level 3 v 3 on a small court (one source: 20 × 10 m), classes C and B without goalkeeper, class A with; blue level 5 v 5 with goalkeeper.
- **Injury prevention:** teams using Knäkontroll had 35 % fewer injuries and 45 % fewer acute injuries (Linköping University with Svensk Innebandy). Two thirds of injuries are overuse, mostly knee and foot. The federation's blue-level fitness page recommends Knäkontroll+ every session.
- **Session structure** (club guides): warm-up → technique/coordination → game → cool-down; technique early; passes first standing, then moving; show rather than explain.
- **Court:** standard 40 × 20 m with boards, so a hall splits into four quarter courts of 20 × 10 m — the green level's match court.
- **Season:** high season 1 October–31 March (Gävleborg's cross-sport guidelines); start in late August.
- **Gaps:** no floorball-specific source found for youth goalkeeper training or an official youth season calendar.

Sources: see the list at the end.

## Scope of the first version

- **Levels:** Grön 6–9 (plays without goalkeepers), Blå 9–12, Röd 12–16, each with a draft philosophy, target skills and four season blocks (weeks 34–41, 42–49, 50–5, 6–12).
- **Skills:** rörelse, bollkontroll, passning, skott, finter & 1 mot 1, spelförståelse, försvarsspel, målvakt.
- **Court areas:** helplan (40 × 20), halvplan (20 × 20), kvartsplan (20 × 10) = one station.
- **Equipment:** bollar, koner, västar, småmål, stora mål, sargbitar, koordinationsstege.
- **Session shape (same base as the hockey club, adapted):** 5 min injury prevention ("Hoppa, landa, stanna") + 5 min warm-up with ball → 5 min gathering and station split → 4 stations on quarter courts, where D is always 3 v 3 ("3 mot 3 på kvartsplan") → whole-group drill and game when the hall time allows → closing talk (5 min, 10 from 75 min). No free zone. All segments in 5-minute steps. 60 min = 5 + 5 + 5 + 4 × 10 + 5.
- **Goalkeepers:** drills can be marked as needing a goalkeeper; the planner leaves them out for levels that play without one.
- **Content:** 42 own drills and 10 templates — drafts, written for the app, NOT copied from Svensk Innebandy's övningsbank or club material. A floorball coach must read them through before the pilot.
- **Branding:** Herrhagens Innebandy crest top left, the club's orange-red (#e2602c, sampled from the crest) for the primary button and ticks.

## Not yet

- Goalkeeper-specific sessions and a goalkeeper station.
- Levels above red.
- Shared club curriculum (needs the backend, as in the hockey app).

## Sources

- SIU-modellens olika nivåer — https://www.innebandy.se/utveckling/svensk-innebandys-utvecklingsmodell-siu/siu-modellens-olika-nivaer
- Grön nivå 6–9 år (Stockholm) — https://www.innebandy.se/stockholm/utbildning/vilken-utbildning-ska-jag-ga/gron-niva-6-9-ar
- Innebandyfys — https://www.innebandy.se/utveckling/svensk-innebandys-utvecklingsmodell-siu/innebandyfys
- Innebandyfys blå nivå (Västmanland) — https://www.innebandy.se/vastmanland/utveckling/svensk-innebandys-utvecklingsmodell-siu/innebandyfys/innebandyfys-bla-niva
- Spelet, grön nivå — https://www.innebandy.se/utveckling/svensk-innebandys-utvecklingsmodell-siu/spelet/spelet-gron-niva
- Knatteligan regler — https://epiadmin.innebandy.se/sv/Utveckling/Barninnebandy/Knatteligan1/Knattligan-regler/
- Tävlingsdirektiv grön och blå nivå (club document) — https://www.laget.se/PIK-P11-13/Document/Download/-1/8613231
- Knäkontroll innebandy, LiU SWIPE — https://liu.se/forskning/swipe/knakontroll-innebandy
- Skadeförebyggande träning i barn- och ungdomsinnebandy, Lund University — https://www.lu.se/publikation/8937796
- Träningsguide grön och blå nivå, Skellefteå IBS — https://www.skellefteaibs.se/Document/Download/333000/9264557
- Samsyn Gävleborg 2025 — https://rfsisu.se/download/18.7726427c1973063c2b454f89/1749132576766/Riktlinjer%20Samsyn%20G%C3%A4vleborg%202025_med%20kontaktpersoner.pdf
