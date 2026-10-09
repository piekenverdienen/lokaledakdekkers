import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { extractProfile } from "@/lib/extract";
import { isDirectory } from "@/lib/directories";
import { authorized } from "@/lib/jobs";
export const maxDuration = 120; export const dynamic = "force-dynamic";
// Bouwt per aanroep een handvol profielen op uit de website (niet publiek, wel klaar) en bewaart het e-mailadres voor de campagne.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ok: false, reden: "geen ANTHROPIC_API_KEY" });
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const limit = Math.min(10, parseInt(new URL(req.url).searchParams.get("limit") ?? "4", 10) || 4);
  const rows = await q<{ id: string; name: string; website: string; slug: string }>(`select id, name, website, slug from businesses where vertical_id=$1 and website is not null and status='unclaimed' and owner_user_id is null and profile_built_at is null and profile_build_error is null and source<>'test' order by random() limit $2`, [v.id, limit]);
  let built = 0, failed = 0;
  for (const b of rows) {
    try {
      if (isDirectory(b.website)) throw new Error("gidssite, geen eigen website");
      const x = await extractProfile(v, b.website, b.name);
      if (!x) throw new Error("niet leesbaar");
      await q(`update businesses set description=coalesce($2, description), emergency=$3 or emergency, certifications=case when cardinality($4::text[])>0 then $4 else certifications end,
               usps=case when cardinality($5::text[])>0 then $5 else usps end, founded_year=coalesce($6, founded_year), phone=coalesce(phone,$7), outreach_email=coalesce(outreach_email,$8), logo_url=case when logo_url like '/media/%' then logo_url else coalesce($9, logo_url) end, profile_built_at=now(), updated_at=now() where id=$1`,
        [b.id, x.description, x.emergency, x.certifications, x.usps, x.founded_year, x.phone, x.email, x.logo_url]);
      if (x.services.length) { await q("delete from business_services where business_id=$1", [b.id]); for (const s of x.services) await q("insert into business_services values ($1,$2) on conflict do nothing", [b.id, s]); }
      if (x.area.length) { await q("delete from business_areas where business_id=$1", [b.id]); for (const n of x.area) await q("insert into business_areas (business_id, place_id) select $1, p.id from places p, businesses bb where bb.id=$1 and lower(p.name)=lower($2) order by p.geom <-> bb.geom limit 1 on conflict do nothing", [b.id, n]); }
      if (x.photos.length) { await q("delete from business_photos where business_id=$1 and url not like '/media/%'", [b.id]); for (const [i, u] of x.photos.slice(0, 6).entries()) await q("insert into business_photos (business_id, url, sort_order) values ($1,$2,$3)", [b.id, u, i]); }
      built++;
    } catch (e) { failed++; await q("update businesses set profile_build_error=$2 where id=$1", [b.id, String((e as Error).message).slice(0, 200)]); }
  }
  const left = await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and website is not null and status='unclaimed' and profile_built_at is null and profile_build_error is null and source<>'test'", [v.id]);
  return NextResponse.json({ ok: true, built, failed, left: left?.n ?? 0 });
}
