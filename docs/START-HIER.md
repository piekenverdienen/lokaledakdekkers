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
De bedrijven komen uit het KvK-adressenbestand (SBI 4391 dakdekken en bouwen van dakconstructies,
plus 4399 met "dak" in de handelsnaam). Bestellen: tellen op kvk.nl met de Bedrijventeller, aanvraag
mailen naar account@kvk.nl, levering als CSV binnen vijf werkdagen. Kolomnamen daarna invullen in
`COLUMNS` bovenin `kvk_import.py`.

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
4. Claim-flow en profiel-uit-URL.
5. Pro met Stripe, offerteformulier (max 3 bedrijven), reviews met factuurbewijs, mails.

## Web-app draaien

    cd web && npm ci
    DATABASE_URL=postgres://... BASE_URL_OVERRIDE=http://localhost:3000 npm run build
    HOSTNAME=0.0.0.0 PORT=3000 DATABASE_URL=postgres://... node .next/standalone/server.js

In Coolify: Docker-app op de map `web/`, omgevingsvariabelen `DATABASE_URL` (interne connection string van lokaal-db)
en later `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`. Het domein bepaalt de vertical:
`lokaledakdekkers.nl` matcht `verticals.domain`; een onbekend domein valt terug op de eerste vertical.
Plaatspagina's met minder dan 3 bedrijven binnen 30 km krijgen automatisch noindex plus canonical naar de gemeente.
