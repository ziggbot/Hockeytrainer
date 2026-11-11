# Driftsättning: Render + Neon

Appen är **en** webbtjänst på Render (API + webbapp) och **en** Postgres-databas på Neon.
Båda körs i Frankfurt (EU). Räkna med cirka 15 minuter första gången.

> Priser, gränser och menyer hos Render och Neon ändras. Siffrorna nedan kontrollerades
> i november 2026. Dubbelkolla på render.com/pricing och neon.com/pricing innan ni bestämmer er.

---

## 1. Skapa databasen på Neon

1. Skapa konto på <https://neon.com> och välj **New project**.
2. Namn: `hockeytrainer`. Region: **AWS Europe (Frankfurt)** (`aws-eu-central-1`).
   Regionen kan inte ändras i efterhand.
3. Postgres-version: behåll standardvalet.
4. Öppna **Connect**, slå på **Connection pooling** och kopiera anslutningssträngen.
   Den ser ut ungefär så här (värdnamnet innehåller `-pooler`):

   ```
   postgresql://neondb_owner:LÖSENORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

   Behandla strängen som ett lösenord. Den får **aldrig** committas, eftersom repot är publikt.

Appen skapar själv tabellerna och lägger in övningsbiblioteket när den startar första gången.

## 2. Publicera appen på Render

1. Skapa konto på <https://render.com> och koppla ditt GitHub-konto.
2. **New → Blueprint** och välj repot `Hockeytrainer`.
   Välj den gren som ska publiceras (normalt `main`, efter att den här grenen är mergad).
3. Render läser `render.yaml` och frågar efter **DATABASE_URL**. Klistra in strängen från Neon.
4. Klicka **Apply** / **Deploy**. Bygget tar några minuter.
   När loggen visar `Server listening` är appen uppe på `https://hockeytrainer-xxxx.onrender.com`.
5. Öppna adressen och välj **Skapa konto och klubb**. Den som gör det blir **klubbadmin**.

### Efter första klubben

- Sätt `ALLOW_CLUB_SIGNUP=false` under *Environment* i Render om ni inte vill att vem som helst
  ska kunna skapa nya klubbar. Inbjudningslänkar fungerar ändå.
- Egen domän (t.ex. `traning.dinklubb.se`) läggs till under *Settings → Custom Domains*.

## 3. Lagledare och tränare

| Roll | Kan göra |
|---|---|
| **Klubbadmin** | Skapa lag och åldersgrupper, lägga säsongsblock, bjuda in och ta bort alla, göra andra till admin, skapa återställningslänkar, se översikt, ladda ner backup |
| **Lagledare** | Allt en tränare kan, plus bjuda in, byta roll på och ta bort ledare i *sitt* lag |
| **Tränare** | Planera och ändra lagets träningar, köra rinkläge, skriva anteckningar, skapa egna övningar |
| **Assistent/förälder** | Öppnar en delningslänk, kan bara läsa och behöver inget konto |

Så här lägger ni till folk:

- **Ny person:** klubbadmin eller lagledare skapar en *inbjudningslänk* (Klubb → Ledare & tränare,
  eller på lagets sida) och skickar den via SMS eller Spond. Länken fungerar **en gång** i **14 dagar**.
- **Person som redan finns i klubben:** klubbadmin väljer *Lägg till i lag*. Ingen ny länk behövs.
- **Glömt lösenord:** appen skickar inga mejl. Klubbadmin skapar en *återställningslänk*
  (giltig 72 timmar, en gång) och skickar den till personen. En admin kan inte återställa
  någon som också är med i en annan klubb som admin inte administrerar.
- En klubb måste alltid ha minst en admin. Utse gärna två.

## 4. Backup

Det finns tre lager, och ni bör ha minst de två första.

### a) Neons inbyggda historik (automatisk)

Neon kan återställa databasen till en tidigare tidpunkt. På **Free** är fönstret bara
**6 timmar** (högst 1 GB ändringar). På **Launch** är det upp till 7 dagar.
Det skyddar mot "jag raderade fel lag nyss", men **är ingen riktig backup**.

### b) Nattlig krypterad backup via GitHub Actions (rekommenderas)

Workflowen `.github/workflows/backup.yml` gör `pg_dump` varje natt kl. 02:17 UTC,
krypterar filen med AES-256 och sparar den i 30 dagar som en *artifact* i GitHub.

**Krypteringen är nödvändig.** Repot är publikt och artifacts i publika repon kan laddas ner av andra.

Aktivera så här (GitHub → repot → *Settings → Secrets and variables → Actions → New repository secret*):

| Secret | Värde |
|---|---|
| `BACKUP_DATABASE_URL` | Neon-strängen (pooled går bra, workflowen byter själv till direktanslutning) |
| `BACKUP_PASSPHRASE` | En lång slumpad lösenfras. **Spara den i en lösenordshanterare.** Utan den går backupen inte att läsa. |

Testa direkt: *Actions → Nattlig databasbackup → Run workflow*. Utan secrets hoppar den över
och visar en notis.

Bra att veta:

- Schemalagda körningar sker bara på repots **standardgren** (`main`).
- GitHub stänger av schemalagda workflows i publika repon efter **60 dagar utan aktivitet** i repot.
  Kolla fliken *Actions* några gånger per säsong.

#### Återställa från en nattlig backup

```bash
# 1. Ladda ner artifact-zipen från Actions-körningen och packa upp den.
gpg --decrypt hockeytrainer-YYYYMMDD-HHMM.dump.gpg > backup.dump

# 2. Återställ helst till en NY Neon-gren eller ett nytt projekt först och kontrollera datan.
#    Använd direktanslutningen (utan "-pooler"). pg_restore måste vara samma eller nyare
#    huvudversion som pg_dump (18), t.ex. via Docker:
docker run --rm -i -e PGURL="postgresql://...neon.tech/neondb?sslmode=require" postgres:18-alpine \
  sh -c 'pg_restore --no-owner --no-acl --clean --if-exists -d "$PGURL"' < backup.dump

# 3. Peka DATABASE_URL i Render mot den återställda databasen och starta om tjänsten.
```

### c) Klubbens egen export (manuell)

Klubbadmin kan ladda ner all klubbens data som en JSON-fil under **Klubb → Backup**.
Gör det inför varje säsongsstart och spara filen säkert. Den innehåller ledarnas namn och e-post.

## 5. Kostnader och begränsningar

| | Gratis | Värt att veta |
|---|---|---|
| **Render Free** | 0 kr | Tjänsten somnar efter **15 minuter** utan trafik. Första besöket därefter tar **ungefär 1 minut**. 750 gratistimmar per månad och arbetsyta. |
| **Neon Free** | 0 kr | 1 GB lagring per projekt och 100 CU-timmar per månad. Databasen pausar efter 5 min och vaknar på någon sekund. Räcker gott för ett antal klubbar. |

**Rekommendation inför piloten:** uppgradera Render-tjänsten till lägsta betalda nivå (*Starter*)
så att den inte somnar. Den sover annars just när en tränare öppnar appen i hallen.
Rinkläget fungerar visserligen offline från telefonens cache, men inloggning, planering
och synk väntar på uppvakningen. Byt även Neon till *Launch* om ni vill ha 7 dagars återställning.
Kontrollera aktuella priser innan.

**Dataskydd:** data lagras i Frankfurt, men både Render och Neon är amerikanska bolag.
Det är samma fråga som specen tar upp för Supabase. Appen lagrar inga spelaruppgifter,
bara ledares namn och e-post. Teckna leverantörernas personuppgiftsbiträdesavtal (DPA)
om klubben kräver det.

## 6. Miljövariabler

| Variabel | Krävs | Standard | Beskrivning |
|---|---|---|---|
| `DATABASE_URL` | ja | – | Neons anslutningssträng. `sslmode=require` skärps automatiskt till `verify-full`. |
| `NODE_ENV` | ja i drift | – | `production` ger säkra cookies (bara HTTPS). |
| `ALLOW_CLUB_SIGNUP` | nej | `true` | `false` stänger skapandet av nya klubbar. |
| `AUTH_RATE_LIMIT_MAX` | nej | `10` | Inloggningsförsök per IP och minut. |
| `PG_POOL_MAX` | nej | `5` | Max antal databasanslutningar. |
| `PORT` | nej | `3000` | Sätts automatiskt av Render. |

## 7. Lokal utveckling

```bash
npm ci
cp .env.example .env               # peka DATABASE_URL mot en lokal Postgres eller en Neon-gren
export $(grep -v '^#' .env | xargs)
npm run dev:server                 # API på :3000 (kör migreringar och seed automatiskt)
npm run dev:web                    # webbapp på :5173 med proxy till API:t
npm test                           # kräver en Postgres-databas, se TEST_DATABASE_URL i server/test/helpers.ts
```
