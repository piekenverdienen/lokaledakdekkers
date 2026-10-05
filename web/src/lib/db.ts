import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pool: Pool | undefined;
}

export const pool =
  global.__pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : undefined,
  });
if (process.env.NODE_ENV !== "production") global.__pool = pool;

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params);
  return r.rows as T[];
}
export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}

export type Vertical = {
  id: number; slug: string; domain: string; name_singular: string; name_plural: string; brand: string;
  schema_type: string; services: { slug: string; name: string }[]; lead_mode: string;
  pro_price_month_cents: number; theme: Record<string, string>;
};
export type Business = {
  id: string; name: string; slug: string; status: "unclaimed" | "claimed" | "pro" | "hidden";
  city: string | null; postcode: string | null; street: string | null; housenumber: string | null;
  phone: string | null; website: string | null; whatsapp: string | null; email: string | null;
  description: string | null; logo_url: string | null; usps: string[]; certifications: string[];
  founded_year: number | null; kvk_number: string | null; kvk_started: string | null;
  emergency: boolean; lat: number | null; lng: number | null; distance_km: number | null;
  verified_at: string | null; kvk_checked_at: string | null; paid_until: string | null; source: string; owner_user_id: string | null;
  avg_score: number | null; review_count: number; verified_reviews: number;
  services: string[]; place_name: string | null; place_slug: string | null;
  municipality_slug: string | null; province_slug: string | null;
};
export type Place = {
  id: number; name: string; slug: string; place_type: string; population: number | null; lat: number; lng: number;
  municipality_id: number; municipality_name: string; municipality_slug: string;
  province_name: string; province_slug: string;
  business_count: number; verified_count: number; avg_score: number | null; review_count: number;
};

const BUSINESS_SELECT = `
  b.id, b.name, b.slug, b.status, b.city, b.postcode, b.street, b.housenumber, b.phone, b.website, b.whatsapp, b.email,
  b.description, b.logo_url, b.usps, b.certifications, b.founded_year, b.kvk_number, b.kvk_started::text, b.emergency,
  b.verified_at::text, b.kvk_checked_at::text, b.paid_until::text, b.source, b.owner_user_id,
  st_y(b.geom) as lat, st_x(b.geom) as lng,
  (select round(avg(score)::numeric,1) from reviews r where r.business_id=b.id and r.status='published') as avg_score,
  (select count(*)::int from reviews r where r.business_id=b.id and r.status='published') as review_count,
  (select count(*)::int from reviews r where r.business_id=b.id and r.status='published' and r.invoice_verified) as verified_reviews,
  coalesce((select array_agg(service_slug order by service_slug) from business_services s where s.business_id=b.id), '{}') as services,
  p.name as place_name, p.slug as place_slug, m.slug as municipality_slug, pr.slug as province_slug`;
const BUSINESS_JOIN = `
  left join places p on p.id=b.place_id
  left join municipalities m on m.id=b.municipality_id
  left join provinces pr on pr.id=m.province_id`;
// Pro eerst, dan geclaimd, dan de rest; binnen een groep op score en afstand
const BUSINESS_ORDER = `
  case b.status when 'pro' then 0 when 'claimed' then 1 else 2 end,
  avg_score desc nulls last, distance_km asc nulls last, b.name`;

export async function getVertical(host: string): Promise<Vertical> {
  const h = host.replace(/^www\./, "").split(":")[0];
  return (
    (await one<Vertical>(`select * from verticals where domain=$1`, [h])) ??
    (await one<Vertical>(`select * from verticals order by id limit 1`))!
  );
}

export async function getProvinces(verticalId: number) {
  return q<{ id: number; name: string; slug: string; business_count: number; municipality_count: number }>(`
    select pr.id, pr.name, pr.slug,
      (select count(*)::int from businesses b join municipalities m on m.id=b.municipality_id
         where m.province_id=pr.id and b.vertical_id=$1 and b.status<>'hidden') as business_count,
      (select count(*)::int from municipalities m where m.province_id=pr.id) as municipality_count
    from provinces pr order by pr.name`, [verticalId]);
}

export async function getProvince(slug: string) {
  return one<{ id: number; name: string; slug: string; lat: number; lng: number }>(`
    select id, name, slug, st_y(st_centroid(geom)) as lat, st_x(st_centroid(geom)) as lng from provinces where slug=$1`, [slug]);
}

export async function getMunicipalities(provinceId: number, verticalId: number) {
  return q<{ id: number; name: string; slug: string; business_count: number; lat: number; lng: number }>(`
    select m.id, m.name, m.slug, st_y(st_centroid(m.geom)) as lat, st_x(st_centroid(m.geom)) as lng,
      (select count(*)::int from businesses b where b.municipality_id=m.id and b.vertical_id=$2 and b.status<>'hidden') as business_count
    from municipalities m where m.province_id=$1 order by m.name`, [provinceId, verticalId]);
}

export async function getMunicipality(provinceSlug: string, slug: string) {
  return one<{ id: number; name: string; slug: string; province_name: string; province_slug: string; lat: number; lng: number }>(`
    select m.id, m.name, m.slug, pr.name as province_name, pr.slug as province_slug,
      st_y(st_centroid(m.geom)) as lat, st_x(st_centroid(m.geom)) as lng
    from municipalities m join provinces pr on pr.id=m.province_id where pr.slug=$1 and m.slug=$2`, [provinceSlug, slug]);
}

export async function getPlacesInMunicipality(municipalityId: number, verticalId: number) {
  return q<Place>(`
    select p.id, p.name, p.slug, p.place_type, p.population, st_y(p.geom) as lat, st_x(p.geom) as lng,
      m.id as municipality_id, m.name as municipality_name, m.slug as municipality_slug, pr.name as province_name, pr.slug as province_slug,
      coalesce(ps.business_count,0)::int as business_count, coalesce(ps.verified_count,0)::int as verified_count, ps.avg_score, coalesce(ps.review_count,0)::int as review_count
    from places p join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    left join place_stats ps on ps.place_id=p.id and ps.vertical_id=$2
    where p.municipality_id=$1 order by p.population desc nulls last, p.name`, [municipalityId, verticalId]);
}

export async function getPlace(provinceSlug: string, municipalitySlug: string, slug: string, verticalId: number) {
  return one<Place>(`
    select p.id, p.name, p.slug, p.place_type, p.population, st_y(p.geom) as lat, st_x(p.geom) as lng,
      m.id as municipality_id, m.name as municipality_name, m.slug as municipality_slug, pr.name as province_name, pr.slug as province_slug,
      coalesce(ps.business_count,0)::int as business_count, coalesce(ps.verified_count,0)::int as verified_count, ps.avg_score, coalesce(ps.review_count,0)::int as review_count
    from places p join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    left join place_stats ps on ps.place_id=p.id and ps.vertical_id=$4
    where pr.slug=$1 and m.slug=$2 and p.slug=$3`, [provinceSlug, municipalitySlug, slug, verticalId]);
}

export async function getBusinessesNear(lat: number, lng: number, verticalId: number, radiusKm = 30, limit = 60) {
  return q<Business>(`
    select ${BUSINESS_SELECT},
      round((st_distance(b.geom::geography, st_setsrid(st_makepoint($2,$1),4326)::geography)/1000)::numeric,1) as distance_km
    from businesses b ${BUSINESS_JOIN}
    where b.vertical_id=$3 and b.status<>'hidden' and b.geom is not null
      and st_dwithin(b.geom::geography, st_setsrid(st_makepoint($2,$1),4326)::geography, $4*1000)
    order by ${BUSINESS_ORDER} limit $5`, [lat, lng, verticalId, radiusKm, limit]);
}

export async function getBusinessesInMunicipality(municipalityId: number, verticalId: number) {
  return q<Business>(`
    select ${BUSINESS_SELECT}, null::numeric as distance_km
    from businesses b ${BUSINESS_JOIN}
    where b.vertical_id=$1 and b.municipality_id=$2 and b.status<>'hidden'
    order by ${BUSINESS_ORDER}`, [verticalId, municipalityId]);
}

export async function getBusiness(slug: string, verticalId: number) {
  return one<Business>(`
    select ${BUSINESS_SELECT}, null::numeric as distance_km
    from businesses b ${BUSINESS_JOIN} where b.vertical_id=$1 and b.slug=$2`, [verticalId, slug]);
}

export async function getReviews(businessId: string) {
  return q<{ id: string; name: string; score: number; body: string; service_slug: string | null; invoice_verified: boolean; created_at: string }>(`
    select id, name, score, body, service_slug, invoice_verified, created_at::text from reviews
    where business_id=$1 and status='published' order by created_at desc limit 20`, [businessId]);
}

export async function getNearbyIndexablePlaces(lat: number, lng: number, verticalId: number, excludeId: number, limit = 6) {
  return q<{ name: string; slug: string; municipality_slug: string; province_slug: string; business_count: number }>(`
    select p.name, p.slug, m.slug as municipality_slug, pr.slug as province_slug, ps.business_count::int
    from place_stats ps join places p on p.id=ps.place_id join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    where ps.vertical_id=$3 and ps.business_count>=3 and p.id<>$4
    order by p.geom <-> st_setsrid(st_makepoint($2,$1),4326) limit $5`, [lat, lng, verticalId, excludeId, limit]);
}

export async function getPageContent(verticalId: number, placeId: number | null, municipalityId: number | null) {
  return one<{ intro: string | null; faq: { q: string; a: string }[] }>(`
    select intro, faq from page_content where vertical_id=$1 and (place_id=$2 or ($2 is null and municipality_id=$3))`,
    [verticalId, placeId, municipalityId]);
}

export async function getIndexablePlaces(verticalId: number) {
  return q<{ slug: string; municipality_slug: string; province_slug: string }>(`
    select p.slug, m.slug as municipality_slug, pr.slug as province_slug
    from place_stats ps join places p on p.id=ps.place_id join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    where ps.vertical_id=$1 and ps.business_count>=3`, [verticalId]);
}
export async function getAllMunicipalities() {
  return q<{ slug: string; province_slug: string }>(`select m.slug, pr.slug as province_slug from municipalities m join provinces pr on pr.id=m.province_id`);
}
export async function getPublicBusinessSlugs(verticalId: number) {
  return q<{ slug: string; updated_at: string }>(`select slug, updated_at::text from businesses where vertical_id=$1 and status<>'hidden' and source<>'test'`, [verticalId]);
}
