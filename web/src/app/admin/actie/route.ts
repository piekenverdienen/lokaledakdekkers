import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getVertical, q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { activateAfterPayment } from "@/lib/activate";
import { one } from "@/lib/db";
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
  else if (actie === "test_reset") {
    await q("update businesses set status='unclaimed', owner_user_id=null, paid_until=null, verified_at=null, profile_built_at=now(), outreach_email=$2, outreach_opt_out=false, description=coalesce(description, name || ' is een ' || 'dakdekkersbedrijf. Deze beschrijving is uit de website opgebouwd.'), updated_at=now() where id=$1 and source='test'", [id, user.email]);
    await q("delete from outreach where business_id=$1", [id]); tab = "test";
  }
  else if (actie === "test_verwijderen") { await q("delete from businesses where id=$1 and source='test'", [id]); tab = "test"; }
  else if (actie === "campagne") {
    const enabled = String(f.get("enabled") ?? "0") === "1" ? "1" : "0"; const perDay = String(f.get("per_day") ?? "auto"); const regions = String(f.get("regions") ?? "").slice(0, 500);
    const was = (await one<{ value: string }>("select value from settings where key='outreach_enabled'"))?.value;
    await q("insert into settings (key, value) values ('outreach_enabled',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [enabled]);
    await q("insert into settings (key, value) values ('outreach_per_day',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [perDay === "auto" ? "auto" : String(parseInt(perDay, 10) || 50)]);
    await q("insert into settings (key, value) values ('outreach_regions',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [regions]);
    if (enabled === "1" && was !== "1") await q("insert into settings (key, value) values ('outreach_started_at',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [new Date().toISOString()]);
    tab = "campagne";
  }
  else if (actie === "testmail") {
    const { claimMail } = await import("@/lib/outreach"); const { sendMail } = await import("@/lib/auth");
    const b = await one<{ name: string; city: string | null; slug: string }>("select name, city, slug from businesses where vertical_id=$1 and status='unclaimed' and profile_built_at is not null and outreach_email is not null and source<>'test' order by random() limit 1", [v.id]);
    if (b) {
      const totals = (await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and status<>'hidden' and source<>'test'", [v.id]))?.n ?? 0;
      const m = claimMail(v, b, 0, totals, base, "test");
      await sendMail(user.email, `[TEST] ${m.subject}`, m.html, m.text).catch(() => {});
    }
    tab = "campagne";
  }
  else if (actie === "weekly") { await q("insert into settings (key, value) values ('weekly_enabled',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [String(f.get("enabled") ?? "0") === "1" ? "1" : "0"]); tab = "campagne"; }
  else if (actie === "bank_ontvangen") {
    const pay = await one<{ id: string; business_id: string }>("select id, business_id from payments where id=$1 and provider='bank' and status='open'", [id]);
    if (pay) await activateAfterPayment(v, pay.business_id, pay.id, base);
    tab = "betalingen";
  }
  else if (actie === "verzoek_afgehandeld") { await q("update claims set verified_at=now() where id=$1", [id]); tab = "verzoeken"; }
  await q("refresh materialized view place_stats").catch(() => {});
  revalidatePath("/", "layout");
  return NextResponse.redirect(`${base}/admin/?tab=${tab}&ok=1`, 303);
}
