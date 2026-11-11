# Hockeytrainer

Gratis träningsplanering för ungdomsishockey. Appen kopplar klubbens utvecklingsplan till kvällens
träning och fungerar vid rinken, även utan nät. Bakgrund och mål finns i [SPEC_hockey.md](SPEC_hockey.md).

**Driftsättning (Render + Neon), roller och backup:** se [docs/DEPLOY.md](docs/DEPLOY.md).

## Det här finns

- **Klubb och roller:** klubbadmin, lagledare och tränare. Personer läggs till med inbjudningslänkar
  som används en gång och ingen e-posttjänst behövs. Admin skapar återställningslänkar för glömda lösenord.
- **Utvecklingsplan:** åldersgrupper med målfärdigheter och säsongsblock med 1–2 fokusområden.
- **Övningsbank:** 16 startövningar (egenskrivna, ska granskas av klubbens tränare) plus klubbens
  och egna övningar. Filtrera på färdighet, ålder, tid och isyta.
- **Planera träning:** ett förslag utifrån lagets pågående block fyller istiden. Ändra ordning,
  minuter och stationer. Totaltiden kontrolleras mot istiden.
- **Utrustningslista** genereras ur övningarna.
- **Rinkläge:** stor timer, coachningspunkter, stationsvy och avbockning av utrustning.
  Skärmen hålls tänd och allt fungerar offline för nästa 7 dagars träningar.
- **Delningslänk** så att assisterande ledare kan läsa utan konto.
- **Anteckningar** efter träningen köas på telefonen utan nät och synkas sedan.
- **Adminöversikt** visar per lag vad som planerats och vilka fokusområden som täckts.
- **Backup:** Neons historik, nattlig krypterad `pg_dump` via GitHub Actions och JSON-export för klubbadmin.

Spelaruppgifter lagras inte (GDPR). Konton innehåller bara namn och e-post.

## Teknik

- `server/`: Node 22, Fastify, PostgreSQL via `pg`. Migreringarna i `server/migrations.ts` körs vid start.
- `web/`: React + Vite (PWA). All text finns i `web/src/i18n/sv.ts`, redo för fler språk.
- Specen föreslog Expo (React Native). Valet blev en installerbar webbapp (PWA) i stället,
  eftersom den kan publiceras direkt på Render och fungerar på iOS, Android och dator utan appbutiker.

```bash
npm ci
npm run typecheck
npm test        # integrationstester mot riktig Postgres (TEST_DATABASE_URL)
npm run build
```

## Inte gjort än (från specen)

- iCal-import av träningstider
- Uppladdning av övningsdiagram (i dag en https-länk till en bild; Renders disk töms vid omstart)
- Inloggning med e-postlänk (kräver en e-posttjänst)
- Godkännande av övningar för att dela dem mellan klubbar
