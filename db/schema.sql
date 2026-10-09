-- Lokaal-engine: schema voor lokaledakdekkers.nl en volgende verticals
-- Postgres 15+ met PostGIS. Draaien: psql "$DATABASE_URL" -f db/schema.sql

create extension if not exists postgis;
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- verticals
create table if not exists verticals (
  id            serial primary key,
  slug          text unique not null,           -- dakdekker
  domain        text unique not null,           -- lokaledakdekkers.nl
  name_singular text not null,                  -- dakdekker
  name_plural   text not null,                  -- dakdekkers
  brand         text not null,                  -- Lokale Dakdekkers
  schema_type   text not null,                  -- RoofingContractor
  sbi_codes     text[] not null default '{}',
  osm_tags      jsonb  not null default '{}',   -- {"craft": ["roofer","roofing"]}
  services      jsonb  not null default '[]',   -- [{"slug":"pannendak","name":"Pannendak"}, ...]
  lead_mode     text   not null default 'quote3' check (lead_mode in ('quote3','exclusive')),
  pro_price_month_cents int not null default 6900,
  pro_price_year_cents  int not null default 69000,
  theme         jsonb  not null default '{}'
);

insert into verticals (slug, domain, name_singular, name_plural, brand, schema_type, sbi_codes, osm_tags, services)
values ('dakdekker', 'lokaledakdekkers.nl', 'dakdekker', 'dakdekkers', 'Lokale Dakdekkers', 'RoofingContractor',
        '{4391,4399}', '{"craft": ["roofer","roofing"]}',
        '[{"slug":"dakrenovatie","name":"Dakrenovatie"},{"slug":"daklekkage","name":"Daklekkage"},
          {"slug":"pannendak","name":"Pannendak"},{"slug":"plat-dak","name":"Plat dak (bitumen, EPDM)"},
          {"slug":"dakisolatie","name":"Dakisolatie"},{"slug":"dakkapel","name":"Dakkapel"},
          {"slug":"dakgoten-zinkwerk","name":"Dakgoten en zinkwerk"},{"slug":"dakinspectie","name":"Dakinspectie"},
          {"slug":"stormschade","name":"Stormschade (spoed)"}]')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------- geografie (gedeeld over verticals)
create table if not exists provinces (
  id        serial primary key,
  name      text not null,
  slug      text unique not null,
  cbs_code  text,
  geom      geometry(MultiPolygon, 4326)
);

create table if not exists municipalities (
  id          serial primary key,
  province_id int references provinces(id),
  osm_id      bigint unique,
  name        text not null,
  slug        text not null,
  cbs_code    text,
  geom        geometry(MultiPolygon, 4326),
  unique (province_id, slug)
);
create index if not exists municipalities_geom_idx on municipalities using gist (geom);

create table if not exists places (
  id              serial primary key,
  municipality_id int references municipalities(id),
  osm_id          bigint unique,
  name            text not null,
  slug            text not null,
  place_type      text,                       -- city, town, village
  population      int,
  geom            geometry(Point, 4326) not null,
  unique (municipality_id, slug)
);
create index if not exists places_geom_idx on places using gist (geom);

-- ---------------------------------------------------------------- bedrijven
do $$ begin
  if not exists (select 1 from pg_type where typname='business_status') then
    create type business_status as enum ('unclaimed','claimed','pro','hidden');
  end if;
end $$;

create table if not exists businesses (
  id              uuid primary key default gen_random_uuid(),
  vertical_id     int not null references verticals(id),
  name            text not null,
  slug            text not null,
  kvk_number      text,
  kvk_branch      text,                       -- vestigingsnummer
  kvk_started     date,                       -- startdatum, zichtbaar als anti-fraudesignaal
  legal_form      text,                       -- eenmanszaak, bv, vof ...
  is_sole_trader  boolean not null default false,
  street          text, housenumber text, postcode text, city text,
  place_id        int references places(id),
  municipality_id int references municipalities(id),
  geom            geometry(Point, 4326),
  phone           text, email text, website text, whatsapp text,
  description     text,
  logo_url        text,
  usps            text[] not null default '{}',
  certifications  text[] not null default '{}', -- VEBIDAK, Dakmeester, VCA
  founded_year    int,
  emergency       boolean not null default false,
  available_from  date,                       -- Pro: pauzeert offerteaanvragen tot deze datum
  status          business_status not null default 'unclaimed',
  source          text not null default 'kvk', -- kvk, osm, manual
  claimed_at      timestamptz,
  owner_user_id   uuid,
  reviewed        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (vertical_id, slug)
);
create index if not exists businesses_geom_idx on businesses using gist (geom);
create index if not exists businesses_name_trgm on businesses using gin (name gin_trgm_ops);
create index if not exists businesses_kvk_idx on businesses (kvk_number);

create table if not exists business_services (
  business_id  uuid references businesses(id) on delete cascade,
  service_slug text not null,
  primary key (business_id, service_slug)
);

create table if not exists business_areas (
  business_id uuid references businesses(id) on delete cascade,
  place_id    int references places(id),
  radius_km   int not null default 30,
  primary key (business_id, place_id)
);

create table if not exists business_hours (
  business_id uuid references businesses(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  opens       time, closes time,
  primary key (business_id, weekday)
);

create table if not exists business_photos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  url         text not null,
  caption     text,
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------- gebruikers, claims, abonnementen
create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists magic_links (
  token      text primary key,
  user_email text not null,
  purpose    text not null,                   -- login, claim, review
  payload    jsonb not null default '{}',
  expires_at timestamptz not null,
  used_at    timestamptz
);

create table if not exists claims (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id),
  email       text not null,
  method      text not null,                  -- email_domain, kvk_letter, manual
  code        text,
  verified_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid unique references businesses(id),
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text not null default 'pro',
  status                 text not null,       -- trialing, active, past_due, canceled
  trial_ends_at          timestamptz,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------- leads en reviews
create table if not exists lead_requests (          -- één offerteaanvraag van een consument
  id           uuid primary key default gen_random_uuid(),
  vertical_id  int not null references verticals(id),
  kind         text not null check (kind in ('quote','emergency')),
  name         text not null, phone text not null, email text,
  place_id     int references places(id),
  service_slug text,
  description  text,
  photo_urls   text[] not null default '{}',
  wanted_when  text,
  ip_hash      text,
  created_at   timestamptz not null default now()
);

create table if not exists leads (                  -- per bedrijf dat de aanvraag kreeg (max 3)
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid references lead_requests(id) on delete cascade,
  business_id uuid references businesses(id),
  type        text not null check (type in ('quote','emergency','call_click','whatsapp_click')),
  status      text not null default 'new',     -- new, quoted, won, lost, no_match
  created_at  timestamptz not null default now()
);
create index if not exists leads_business_idx on leads (business_id, created_at desc);

create table if not exists reviews (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid references businesses(id) on delete cascade,
  name             text not null,
  email            text not null,
  score            smallint not null check (score between 1 and 5),
  body             text not null,
  service_slug     text,
  place_id         int references places(id),
  invoice_url      text,                      -- alleen admin; na 90 dagen verwijderen (cron)
  invoice_verified boolean not null default false,
  invoice_amount_cents int,
  invoice_m2       numeric,
  status           text not null default 'pending', -- pending, published, rejected
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------- content en statistieken
create table if not exists page_content (
  id              serial primary key,
  vertical_id     int not null references verticals(id),
  place_id        int references places(id),
  municipality_id int references municipalities(id),
  intro           text,
  faq             jsonb not null default '[]',
  generated_at    timestamptz,
  reviewed        boolean not null default false,
  unique (vertical_id, place_id),
  unique (vertical_id, municipality_id)
);

create table if not exists events (                 -- weergaven en klikken, per dag samengevat
  day         date not null,
  business_id uuid references businesses(id) on delete cascade,
  kind        text not null,                  -- view, call_click, whatsapp_click, quote
  count       int not null default 0,
  primary key (day, business_id, kind)
);

-- place_stats: per plaats en vertical, bedrijven binnen 30 km, geverifieerd, score, richtprijzen
create materialized view if not exists place_stats as
select p.id as place_id, v.id as vertical_id,
       count(b.id) filter (where b.status <> 'hidden') as business_count,
       count(b.id) filter (where b.status in ('claimed','pro')) as verified_count,
       round(avg(r.score)::numeric, 1) as avg_score,
       count(r.id) as review_count
from places p
cross join verticals v
left join businesses b on b.vertical_id = v.id
  and st_dwithin(b.geom::geography, p.geom::geography, 30000)
left join reviews r on r.business_id = b.id and r.status = 'published'
group by p.id, v.id;
create unique index if not exists place_stats_idx on place_stats (place_id, vertical_id);

-- indexeerregel: alleen plaatsen met 3 of meer bedrijven zijn indexeerbaar
create or replace view indexable_places as
select ps.*, p.slug, p.name
from place_stats ps join places p on p.id = ps.place_id
where ps.business_count >= 3;

alter table businesses add column if not exists kvk_slug text;
alter table businesses add column if not exists kvk_checked_at timestamptz;

alter table businesses add column if not exists paid_until date;
alter table businesses add column if not exists verified_at timestamptz;
alter table verticals add column if not exists verified_price_year_cents int not null default 7995;
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references businesses(id) on delete cascade,
  provider        text not null default 'mollie',
  provider_id     text unique,
  kind            text not null default 'verified_year',
  amount_cents    int not null,
  status          text not null default 'open',
  paid_at         timestamptz,
  consumer_name   text,
  created_at      timestamptz not null default now()
);

alter table businesses add column if not exists website_source text;
alter table businesses add column if not exists website_checked_at timestamptz;
create index if not exists businesses_website_check_idx on businesses (website_checked_at) where website is null;

alter table reviews add column if not exists email_verified_at timestamptz;
alter table reviews add column if not exists invoice_ref text;

create table if not exists media (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete cascade,
  kind          text not null default 'photo',
  mime          text not null,
  bytes         bytea not null,
  width         int,
  height        int,
  created_at    timestamptz not null default now()
);
create index if not exists media_business_idx on media (business_id);

alter table media alter column business_id drop not null;
alter table lead_requests add column if not exists roof_type text;
alter table lead_requests add column if not exists size_m2 int;
alter table lead_requests add column if not exists address text;
alter table lead_requests add column if not exists contact_pref text;
alter table leads add column if not exists viewed_at timestamptz;

-- ronde 6: vooraf bouwen, campagne, facturen, statistieken
alter table businesses add column if not exists profile_built_at timestamptz;
alter table businesses add column if not exists profile_build_error text;
alter table businesses add column if not exists outreach_email text;
alter table businesses add column if not exists outreach_opt_out boolean not null default false;
alter table businesses add column if not exists renewal_mailed_at timestamptz;
alter table businesses add column if not exists views_total int not null default 0;
create table if not exists outreach (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses(id) on delete cascade,
  email         text not null,
  token         text not null unique,
  sent_at       timestamptz,
  reminder_at   timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create unique index if not exists outreach_business_idx on outreach (business_id);
create table if not exists settings (key text primary key, value text not null, updated_at timestamptz not null default now());
alter table payments add column if not exists invoice_no int;
alter table payments add column if not exists invoice_sent_at timestamptz;
create sequence if not exists invoice_seq start 1001;
create table if not exists page_views (
  day         date not null,
  path        text not null,
  business_id uuid,
  views       int not null default 0,
  visitors    int not null default 0,
  primary key (day, path)
);
create table if not exists page_view_visitors (day date not null, path text not null, visitor text not null, primary key (day, path, visitor));

-- ronde 7: gratis vs betaald, aanvraag als haak
alter table businesses add column if not exists availability text not null default 'available';
alter table businesses add column if not exists available_from text;
alter table reviews add column if not exists reply text;
alter table reviews add column if not exists replied_at timestamptz;
alter table leads add column if not exists teaser_sent_at timestamptz;
alter table leads add column if not exists requester_notified_at timestamptz;
create table if not exists review_invites (id uuid primary key default gen_random_uuid(), business_id uuid references businesses(id) on delete cascade, email text not null, sent_at timestamptz not null default now());

-- rechtsvorm voor de mailregels (Telecommunicatiewet 11.7)
alter table businesses add column if not exists legal_form text;
alter table businesses add column if not exists legal_class text;   -- 'rechtspersoon', 'natuurlijk', null = onbekend
alter table businesses add column if not exists legal_checked_at timestamptz;
alter table outreach add column if not exists kind text not null default 'claim';
update businesses set legal_class='rechtspersoon', legal_form=coalesce(legal_form,'B.V. (uit naam)') where legal_class is null and name ~* '(^|[^a-z])(b\.?\s?v\.?|n\.?\s?v\.?)([^a-z]|$)';
alter table outreach add column if not exists variant text;
alter table businesses add column if not exists outreach_opt_out_at timestamptz;
alter table businesses add column if not exists outreach_opt_out_via text;
