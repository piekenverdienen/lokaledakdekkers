import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
import { authorized } from "@/lib/jobs";
export const dynamic = "force-dynamic";
// Weekoverzicht op maandag voor geverifieerde profielen: bezoekers, aanvragen, reviews. Eén keer per week per bedrijf.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  if (new Date().getUTCDay() !== 1) return NextResponse.json({ ok: true, skipped: "niet maandag" });
  const v = await getVertical(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""); const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const last = (await one<{ value: string }>("select value from settings where key='weekly_sent'"))?.value;
  const week = new Date().toISOString().slice(0, 10);
  if (last === week) return NextResponse.json({ ok: true, skipped: "al verstuurd" });
  const rows = await q<{ id: string; name: string; slug: string; email: string | null; views: number; leads: number; reviews: number; paid_until: string | null }>(`
    select b.id, b.name, b.slug, coalesce(u.email, b.email) as email, b.paid_until::text,
      coalesce((select sum(views)::int from page_views pv where pv.business_id=b.id and pv.day >= current_date - 7), 0) as views,
      (select count(*)::int from leads l where l.business_id=b.id and l.created_at >= now() - interval '7 days') as leads,
      (select count(*)::int from reviews r where r.business_id=b.id and r.status='published' and r.created_at >= now() - interval '7 days') as reviews
    from businesses b left join users u on u.id=b.owner_user_id where b.status in ('claimed','pro') and b.source<>'test'`);
  let mailed = 0;
  for (const r of rows) {
    if (!r.email) continue;
    const tips = r.views < 5 ? "<p>Tip: deel je profiel op je eigen kanalen via het blok Delen in je dashboard; dat levert direct bezoekers op.</p>" : r.leads === 0 ? "<p>Tip: voeg foto's van recent werk toe en vraag een tevreden klant om een review; profielen met reviews krijgen de meeste aanvragen.</p>" : "";
    const html = `<p>Je weekoverzicht voor <b>${r.name}</b>:</p><ul><li><b>${r.views}</b> keer bekeken</li><li><b>${r.leads}</b> offerteaanvragen</li><li><b>${r.reviews}</b> nieuwe reviews</li></ul>${tips}${r.paid_until ? `<p style="color:#5A6975;font-size:13px">Je profiel is actief tot ${r.paid_until}.</p>` : ""}`;
    try { await sendMail(r.email, `Deze week: ${r.views} bezoekers en ${r.leads} aanvragen voor ${r.name}`, mailLayout(v.brand, "Je weekoverzicht", html, { href: `${base}/dashboard/${r.slug}/`, label: "Naar je dashboard" }), `${r.name}: ${r.views} keer bekeken, ${r.leads} aanvragen, ${r.reviews} reviews. ${base}/dashboard/${r.slug}/`); mailed++; } catch { /* volgende */ }
  }
  await q("insert into settings (key, value) values ('weekly_sent',$1) on conflict (key) do update set value=excluded.value, updated_at=now()", [week]);
  return NextResponse.json({ ok: true, mailed });
}
