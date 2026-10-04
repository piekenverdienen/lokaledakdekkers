import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { extractProfile } from "@/lib/extract";
import { ownedBusiness } from "@/lib/owned";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData();
  const website = String(f.get("website") ?? b.website ?? "").trim();
  if (!website) return NextResponse.redirect(`${base}/dashboard/${slug}/?fout=site`, 303);
  const x = await extractProfile(v, website, b.name);
  if (!x) return NextResponse.redirect(`${base}/dashboard/${slug}/?fout=site`, 303);

  await q(`update businesses set website=$2, description=coalesce($3, description), emergency=$4 or emergency,
           certifications=case when cardinality($5::text[])>0 then $5 else certifications end,
           usps=case when cardinality($6::text[])>0 then $6 else usps end,
           founded_year=coalesce($7, founded_year), phone=coalesce(phone,$8), email=coalesce(email,$9), logo_url=coalesce($10, logo_url), updated_at=now() where id=$1`,
    [b.id, website.startsWith("http") ? website : `https://${website}`, x.description, x.emergency, x.certifications, x.usps, x.founded_year, x.phone, x.email, x.logo_url]);
  if (x.services.length) {
    await q("delete from business_services where business_id=$1", [b.id]);
    for (const s of x.services) await q("insert into business_services values ($1,$2) on conflict do nothing", [b.id, s]);
  }
  if (x.area.length) {
    await q("delete from business_areas where business_id=$1", [b.id]);
    for (const n of x.area) await q(`insert into business_areas (business_id, place_id) select $1, p.id from places p, businesses bb where bb.id=$1 and lower(p.name)=lower($2) order by p.geom <-> bb.geom limit 1 on conflict do nothing`, [b.id, n]);
  }
  if (x.photos.length) {
    await q("delete from business_photos where business_id=$1", [b.id]);
    for (const [i, u] of x.photos.slice(0, b.status === "pro" ? 30 : 6).entries()) await q("insert into business_photos (business_id, url, sort_order) values ($1,$2,$3)", [b.id, u, i]);
  }
  return NextResponse.redirect(`${base}/dashboard/${slug}/?gebouwd=${x.pages_read}`, 303);
}
