import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";



const clean = (s: FormDataEntryValue | null) => String(s ?? "").replace(/—|–/g, ",").trim();
const list = (s: FormDataEntryValue | null, sep: RegExp) => clean(s).split(sep).map((x) => x.trim()).filter(Boolean);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user) return NextResponse.redirect(`${base}/dashboard/`, 303);
  if (!b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData();
  const block = String(f.get("block") ?? "");

  if (block === "contact") {
    const year = parseInt(clean(f.get("founded_year")), 10);
    await q("update businesses set phone=nullif($2,''), whatsapp=nullif($3,''), email=nullif($4,''), website=nullif($5,''), founded_year=$6, emergency=$7, updated_at=now() where id=$1",
      [b.id, clean(f.get("phone")), clean(f.get("whatsapp")), clean(f.get("email")).toLowerCase(), clean(f.get("website")), Number.isInteger(year) && year > 1800 ? year : null, f.get("emergency") === "on"]);
  } else if (block === "description") {
    await q("update businesses set description=nullif($2,''), updated_at=now() where id=$1", [b.id, clean(f.get("description")).slice(0, 1500)]);
  } else if (block === "services") {
    const allowed = new Set(v.services.map((s) => s.slug));
    const chosen = f.getAll("services").map(String).filter((s) => allowed.has(s));
    await q("delete from business_services where business_id=$1", [b.id]);
    for (const s of chosen) await q("insert into business_services values ($1,$2) on conflict do nothing", [b.id, s]);
  } else if (block === "area") {
    const names = list(f.get("area"), /,|\n/).slice(0, 40);
    await q("delete from business_areas where business_id=$1", [b.id]);
    for (const n of names) {
      // dichtstbijzijnde plaats met die naam bij het bedrijf
      await q(`insert into business_areas (business_id, place_id) select $1, p.id from places p, businesses bb
               where bb.id=$1 and lower(p.name)=lower($2) order by p.geom <-> bb.geom limit 1 on conflict do nothing`, [b.id, n]);
    }
  } else if (block === "extras") {
    await q("update businesses set certifications=$2, usps=$3, updated_at=now() where id=$1", [b.id, list(f.get("certifications"), /,/).slice(0, 8), list(f.get("usps"), /\n/).slice(0, 4)]);
  } else if (block === "photos") {
    const max = b.status === "pro" ? 30 : 6;
    const urls = list(f.get("photos"), /\n/).filter((u) => /^https?:\/\//.test(u)).slice(0, max);
    await q("delete from business_photos where business_id=$1", [b.id]);
    for (const [i, u] of urls.entries()) await q("insert into business_photos (business_id, url, sort_order) values ($1,$2,$3)", [b.id, u, i]);
    const logo = clean(f.get("logo_url"));
    await q("update businesses set logo_url=$2, updated_at=now() where id=$1", [b.id, /^https?:\/\//.test(logo) ? logo : null]);
  }
  return NextResponse.redirect(`${base}/dashboard/${slug}/`, 303);
}
