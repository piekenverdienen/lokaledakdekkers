# Lokaledakdekkers.nl: start hier

Regionale bedrijvengids en leadgenerator voor dakdekkers. Eerste vertical van de Lokaal-engine.
De PRD staat als Claude Doc: "PRD Lokaledakdekkers.nl". Dit bestand is de technische overdracht.

## Stack (definitief, wijkt af van de eerste PRD-versie)

- Hosting: Hetzner-server van Paul met Coolify (zelfde server als Vakantiekoers).
- Database: eigen Postgres 16 met PostGIS in Coolify, schema in `db/schema.sql`.
- App: Next.js 15 (App Router), Tailwind, als Docker-app in Coolify. Geen Vercel, geen Supabase.
- Auth: magic links via Resend (tabel `magic_links`), geen wachtwoorden.
- Betalingen: Stripe Checkout plus Customer Portal.
- Kaart: Leaflet met OSM-tiles.
- AI: Claude Haiku voor extractie en moderatie, Sonnet voor intro-teksten; aangeroepen vanuit de app met Pauls API-sleutel.

## Mappen

    db/schema.sql           volledige database, inclusief place_stats en indexable_places
    importer/osm_extract.py gemeenten, plaatsen en dakdekkers uit een Geofabrik .osm.pbf
    importer/geo_load.py    gemeenten en plaatsen naar Postgres
    importer/kvk_import.py  KvK-adressenbestand (CSV) naar businesses, met geocoding en koppeling
    importer/out/           uitvoer van osm_extract.py voor Overijssel (gemeenten, plaatsen)
    web/                    Next.js 15-app: home, provincie, gemeente, plaats, profiel, kosten, betrouwbaar, sitemap, robots, Dockerfile

## Databronnen: wat bleek

OpenStreetMap heeft in Nederland bijna geen dakdekkers getagd: Overijssel 4 stuks op `craft=roofer`,
en zoeken op "dak" in de naam levert er nog 3. OSM is dus alleen bruikbaar voor gemeenten en plaatsen.
De bedrijven komen via overheid.io (OpenKvK v3, abonnement Medium) met `web/scripts/import-kvk.mjs`, dat bij het
opstarten van de container draait als OVERHEID_IO_KEY gezet is en er nog geen KvK-data staat. Per postcodegebied (2 cijfers)
zodat elke query onder de pagineringslimiet blijft; alleen actieve vestigingen; eenmanszaken zonder straat en huisnummer.
`importer/kvk_import.py` blijft bruikbaar voor een los KvK-adressenbestand (CSV).

## Draaien

    psql "$DATABASE_URL" -f db/schema.sql
    cd importer
    python3 osm_extract.py data/overijssel.osm.pbf out          # per provincie, of netherlands-latest.osm.pbf
    DATABASE_URL=... python3 geo_load.py out "Overijssel"
    DATABASE_URL=... python3 kvk_import.py data/kvk_dakdekkers.csv dakdekker

Geofabrik-bestanden: https://download.geofabrik.de/europe/netherlands/<provincie>-latest.osm.pbf
(Overijssel is 114 MB, heel Nederland ongeveer 1,3 GB). Python-pakketten: `osmium shapely psycopg`.

## Vaste regels

1. Geen em-dashes, nergens, ook niet in mails of meta-descriptions.
2. Alleen plaatsen met 3 of meer bedrijven binnen 30 km zijn indexeerbaar (`indexable_places`); de rest noindex.
3. Geen enkel cijfer op de site zonder bron in de database (place_stats, reviews met factuur).
4. Eenmanszaken zonder straat en huisnummer tot het bedrijf zelf claimt.
5. Paul doet zelf: accounts, betalingen, DNS, API-sleutels. Vragen, niet zelf doen.
6. Secrets alleen in Coolify; voor elke deploy een grep op API-sleutels in de broncode.

## Rondes

1. Fundament: schema, importer, geo-data Overijssel. Klaar. Volledig NL volgt als het KvK-bestand er is.
2. Next.js: home, provincie, gemeente, plaats, profiel, kaart, schema.org, sitemaps. Klaar en lokaal getest (noindex-regel, canonicals, 404, sitemap).
3. Live op Hetzner via Coolify, DNS bij Antagonist.
4. Claim-flow en profiel-uit-URL. Klaar en end-to-end getest (zoeken, domeincheck, magic link eenmalig, dashboard, bouwen uit website, blokken opslaan, Zet live, publiek profiel).
5. Pro met Stripe, offerteformulier (max 3 bedrijven), reviews met factuurbewijs, mails.

## Web-app draaien

    cd web && npm ci
    DATABASE_URL=postgres://... BASE_URL_OVERRIDE=http://localhost:3000 npm run build
    HOSTNAME=0.0.0.0 PORT=3000 DATABASE_URL=postgres://... node .next/standalone/server.js

In Coolify: Docker-app op de map `web/`, omgevingsvariabelen `DATABASE_URL` (interne connection string van lokaal-db)
en later `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`. Het domein bepaalt de vertical:
`lokaledakdekkers.nl` matcht `verticals.domain`; een onbekend domein valt terug op de eerste vertical.
Plaatspagina's met minder dan 3 bedrijven binnen 30 km krijgen automatisch noindex plus canonical naar de gemeente.

## Omgevingsvariabelen op de app (Coolify)

    DATABASE_URL        interne connection string van lokaal-db (staat)
    SESSION_SECRET      willekeurige lange string, voor de inlogcookie (staat)
    ADMIN_EMAIL         ontvangt de brief-met-code verzoeken (staat: paul@yourfellow.nl)
    RESEND_API_KEY      Paul: aanmaken op resend.com, domein mail.lokaledakdekkers.nl verifiëren
    MAIL_FROM           bijv. "Lokale Dakdekkers <noreply@mail.lokaledakdekkers.nl>"
    OVERHEID_IO_KEY     overheid.io (OpenKvK v3), voor de import van alle bedrijven met de SBI-codes van de vertical (staat)
    FORCE_KVK_IMPORT    zet op 1 om de KvK-import opnieuw te draaien bij de volgende start; daarna weer weghalen
    SERPER_API_KEY      serper.dev, voor de websitezoeker (scripts/find-websites.mjs) die per bedrijf de eigen site zoekt en controleert
    ANTHROPIC_API_KEY   Paul: voor profiel-uit-URL (Claude Haiku); zonder sleutel valt de bouwer terug op meta-description en foto's
    EXTRACT_MODEL       optioneel, standaard claude-haiku-4-5
    MOLLIE_API_KEY      Paul: test_... voor testen, live_... na activatie; zonder sleutel is de betaalknop uitgeschakeld
    WEBHOOK_BASE_URL    optioneel, alleen als de webhook via een ander adres moet binnenkomen

Zonder RESEND_API_KEY worden mails niet verzonden maar in het containerlog gezet (Coolify, Logs). Handig om te testen.

## Verdienmodel (besloten 5 oktober 2026)

Gratis: KvK-vermelding. Geverifieerd: 79,95 per jaar via Mollie iDEAL (verticals.verified_price_year_cents), geeft het gegenereerde
profiel, label Geverifieerd, link, reviews, offerteblok. Pro: 69 per maand (later), bovenaan plus offerteaanvragen uit de plaatspagina.
Geen brief-met-code meer: verificatie is volledig automatisch (website plus e-mail, zie hieronder). Verlenging: mail 30 dagen voor paid_until (nog te bouwen).

## Claim-flow, zo werkt hij

/claim/ zoekt op naam, plaats of KvK-nummer. /claim/[slug]/ vraagt website en e-mailadres. lib/verify.ts haalt de site op en
controleert (1) of de bedrijfsnaam of het KvK-nummer op de site staat en (2) of het e-mailadres op het domein van de site zit of
letterlijk op de site staat. Beide goed: magic link (30 minuten, eenmalig). Na de link is het bedrijf eigenaar, wordt het profiel
direct uit de website gebouwd (lib/build.ts) en landt het in /dashboard/[slug]/ als concept. Betalen via /dashboard/[slug]/betaal/
(Mollie) en de webhook /api/mollie/webhook/ zet status claimed, verified_at en paid_until. Pas dan is het profiel publiek met label.


## Stand van zaken 5 oktober 2026, avond (ronde 6)

Wat er sinds de ochtend bij is gekomen, in de volgorde waarin een developer het tegenkomt:

- **Data**: 8.462 actieve dakdekkers (overheid.io, SBI 4391), geocoded en gekoppeld aan gemeente en plaats. Websites via de
  websitezoeker (Serper + naamcontrole), nu 825; de zoeker hervat elke 6 uur vanzelf zodra er Serper-credits zijn.
- **Profielen vooraf bouwen**: `/api/jobs/prebuild/` (via `scripts/worker.mjs`, 4 per minuut) bouwt uit de website een profiel
  (Haiku) voor elk bedrijf met website; niet publiek, wel klaar. Bewaart ook `outreach_email` voor de campagne.
- **Claim-flow**: website + e-mail, automatische verificatie (`lib/verify.ts`), inloglink, profiel direct gebouwd, dashboard met
  potlood per blok, foto- en logo-upload (opslag in tabel `media`, webp, route `/media/[id]`), eigenaarsvoorbeeld van het profiel.
- **Betalen**: Mollie (`/dashboard/[slug]/betaal/`, webhook `/api/mollie/webhook/`), 79,95 incl. btw, status claimed + paid_until,
  factuur met nummer uit `invoice_seq` op `/factuur/[id]/` (printbaar), factuurmail. Verlengingsmail 30 dagen vooraf en terugval
  naar basisvermelding 7 dagen na afloop via `/api/jobs/renewal/`. Verkopersgegevens via INVOICE_* env.
- **Offertes**: formulier op elk profiel met eigenaar (`components/QuoteForm.tsx`, route `/offerte/[slug]/`), mail naar bedrijf,
  aanvrager en beheerder; aanvragen met status in het dashboard (`/dashboard/[slug]/aanvraag/[id]/`).
- **Reviews**: formulier, e-mailbevestiging, goedkeuring in beheer; label Geverifieerde klus.
- **Campagne**: `/api/jobs/outreach/` stuurt de claim-mail (`lib/outreach.ts`) alleen als `settings.outreach_enabled=1`
  (knop in beheer, tab Campagne), op werkdagen 8 tot 18 uur, max `outreach_per_day`, herinnering na 7 dagen, uitschrijven via
  `/uitschrijven/[token]/`. Kliks worden geregistreerd via `?o=token` op het profiel.
- **Beheer** (`/admin/`, ADMIN_EMAIL): reviews, correcties, betalingen, bedrijven verbergen, geverifieerd, testbedrijven,
  campagne, bezoekers.
- **Statistieken**: cookieloze teller (`components/Hit.tsx` naar `/api/hit/`), tabel `page_views`, per bedrijf `views_total`;
  weekoverzichtsmail op maandag (`/api/jobs/weekly/`).
- **Deelbaarheid**: deelafbeelding per bedrijf (`/og/[slug]/`, next/og met DejaVu uit public/fonts), deelblok in dashboard,
  standaard `og-default.png` voor de rest. Kennisbank met vaste dakdekker Bart Veldhuis (Higgsfield-element
  `0570cc62-3f7f-477c-93ed-cc3175832573`) op elke foto, alt en title in de frontmatter.
- **Overig**: cookiemelding (alleen functionele cookies), honeypot `website2` op alle formulieren, limiet per IP op offertes,
  healthcheck `/api/health/` voor deploys zonder onderbreking, testbedrijven (`source='test'`) noindex en buiten de sitemap.

Jobs draaien binnen de container (`scripts/worker.mjs`) tegen de eigen server met een token afgeleid van SESSION_SECRET
(`lib/jobs.ts`). Extra env sinds vandaag: MOLLIE_API_KEY, SERPER_API_KEY, PUBLIC_HOST, INVOICE_SELLER, INVOICE_ADDRESS,
INVOICE_KVK, INVOICE_BTW, GOOGLE_SITE_VERIFICATION.
