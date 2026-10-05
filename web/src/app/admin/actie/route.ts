import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getVertical, q } from "@/lib/db";
import { getUser } from "@/lib/auth";
export async function POST(req: Request) {
  const user = await getUser();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  if (!user?.is_admin) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData(); const actie = String(f.get("actie")); const id = String(f.get("id")); let tab = "reviews";
  if (actie === "review_publiceer") { await q("update reviews set status='published', invoice_verified=$2 where id=$1", [id, f.get("factuur") === "1"]); }
  else if (actie === "review_afwijzen") { await q("update reviews set status='rejected' where id=$1", [id]); }
  else if (actie === "bedrijf_verberg") { await q("update businesses set status='hidden', updated_at=now() where id=$1", [id]); if (f.get("claim")) await q("update claims set verified_at=now() where id=$1", [String(f.get("claim"))]); tab = f.get("claim") ? "verzoeken" : "bedrijven"; }
  else if (actie === "bedrijf_toon") { await q("update businesses set status=case when paid_until >= current_date then 'claimed' else 'unclaimed' end, updated_at=now() where id=$1", [id]); tab = "bedrijven"; }
  else if (actie === "test_aanmaken") {
    const naam = String(f.get("naam") ?? "").trim().slice(0, 120); let website = String(f.get("website") ?? "").trim(); const plaats = String(f.get("plaats") ?? "").trim().slice(0, 80);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    if (naam && website && plaats) {
      const slug = `test-${naam.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
      await q(`insert into businesses (vertical_id, name, slug, city, website, source, status, geom, place_id, municipality_id)
               select $1, $2, $3, $4, $5, 'test', 'unclaimed', p.geom, p.id, p.municipality_id from places p where lower(p.name)=lower($4) order by p.population desc nulls last limit 1`, [v.id, naam, slug, plaats, website]);
      await q("insert into businesses (vertical_id, name, slug, city, website, source, status) select $1,$2,$3,$4,$5,'test','unclaimed' where not exists (select 1 from businesses where slug=$3)", [v.id, naam, slug, plaats, website]);
    }
    tab = "test";
  }
  else if (actie === "test_verwijderen") { await q("delete from businesses where id=$1 and source='test'", [id]); tab = "test"; }
  else if (actie === "campagne") {
    const enabled = String(f.get("enabled") ?? "0") === "1" ? "1" : "0"; const perDay = String(parseInt(String(f.get("per_day") ?? "200"), 10) || 200);
    await q("insert into settings (key, value) values ('outreach_enabled',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [enabled]);
    await q("insert into settings (key, value) values ('outreach_per_day',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [perDay]);
    tab = "campagne";
  }
  else if (actie === "weekly") { await q("insert into settings (key, value) values ('weekly_enabled',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [String(f.get("enabled") ?? "0") === "1" ? "1" : "0"]); tab = "campagne"; }
  else if (actie === "verzoek_afgehandeld") { await q("update claims set verified_at=now() where id=$1", [id]); tab = "verzoeken"; }
  await q("refresh materialized view place_stats").catch(() => {});
  revalidatePath("/", "layout");
  return NextResponse.redirect(`${base}/admin/?tab=${tab}&ok=1`, 303);
}
