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
  } else if (block === "facts") {
    const num = (k: string, lo: number, hi: number) => { const n = parseInt(clean(f.get(k)), 10); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
    const facts = {
      in_het_kort: clean(f.get("kort")).split(/\r?\n/).map((x) => x.trim().replace(/^[-*•]\s*/, "")).filter((x) => x.length > 3).slice(0, 8),
      spoed: f.get("spoed") === "on", spoed247: f.get("spoed247") === "on", gratis_inspectie: f.get("gratis_inspectie") === "on",
      materialen: f.getAll("materialen").map(String).slice(0, 12), onderdelen: f.getAll("onderdelen").map(String).slice(0, 12),
      garantie_jaren: num("garantie_jaren", 1, 30), garantie_op: clean(f.get("garantie_op")).slice(0, 60) || null, sinds: num("sinds", 1850, 2030),
      keurmerken: list(f.get("keurmerken"), /[,;\n]/).slice(0, 8), kernen: list(f.get("kernen"), /[,;\n]/).slice(0, 20),
    };
    await q("update businesses set facts=$2, facts_by_owner=true, facts_at=now(), founded_year=coalesce($3, founded_year), updated_at=now() where id=$1", [b.id, JSON.stringify(facts), facts.sinds]);
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
