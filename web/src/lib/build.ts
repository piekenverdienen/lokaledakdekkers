import { one, q, type Vertical } from "./db";
import { extractProfile } from "./extract";
import { isDirectory } from "./directories";

// Bouwt het profiel uit de website en slaat het op als concept (niet live). Geeft het aantal gelezen pagina's terug.
export async function buildProfile(v: Vertical, businessId: string, slug: string, website: string) {
  const b = await one<{ name: string; status: string }>("select name, status from businesses where id=$1", [businessId]);
  if (!b) return 0;
  if (isDirectory(website)) return false as never;
  const x = await extractProfile(v, website, b.name);
  if (!x) return 0;
  await q(`update businesses set website=$2, description=coalesce($3, description), emergency=$4 or emergency,
           certifications=case when cardinality($5::text[])>0 then $5 else certifications end,
           usps=case when cardinality($6::text[])>0 then $6 else usps end,
           founded_year=coalesce($7, founded_year), phone=coalesce(phone,$8), email=coalesce(email,$9), logo_url=case when logo_url like '/media/%' then logo_url else coalesce($10, logo_url) end, updated_at=now() where id=$1`,
    [businessId, website.startsWith("http") ? website : `https://${website}`, x.description, x.emergency, x.certifications, x.usps, x.founded_year, x.phone, x.email, x.logo_url]);
  if (x.services.length) {
    await q("delete from business_services where business_id=$1", [businessId]);
    for (const s of x.services) await q("insert into business_services values ($1,$2) on conflict do nothing", [businessId, s]);
  }
  if (x.area.length) {
    await q("delete from business_areas where business_id=$1", [businessId]);
    for (const n of x.area) await q(`insert into business_areas (business_id, place_id) select $1, p.id from places p, businesses bb where bb.id=$1 and lower(p.name)=lower($2) order by p.geom <-> bb.geom limit 1 on conflict do nothing`, [businessId, n]);
  }
  if (x.photos.length) {
    // Zelf geüploade foto's (/media/) blijven staan; alleen foto's van de website worden ververst en aangevuld tot het maximum.
    await q("delete from business_photos where business_id=$1 and url not like '/media/%'", [businessId]);
    const kept = (await q<{ n: number }>("select count(*)::int as n from business_photos where business_id=$1", [businessId]))[0]?.n ?? 0;
    const max = b.status === "pro" ? 30 : 6;
    for (const [i, u] of x.photos.slice(0, Math.max(0, max - kept)).entries()) await q("insert into business_photos (business_id, url, sort_order) values ($1,$2,$3)", [businessId, u, kept + i]);
  }
  return x.pages_read;
}
