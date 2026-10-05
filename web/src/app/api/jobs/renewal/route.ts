import { NextResponse } from "next/server";
import { getVertical, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
import { authorized } from "@/lib/jobs";
export const dynamic = "force-dynamic";
// Verlengingsmail 30 dagen vooraf, en profielen terugzetten naar basisvermelding als de betaling verlopen is.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const v = await getVertical(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""); const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const due = await q<{ id: string; name: string; slug: string; email: string | null; paid_until: string }>(`select b.id, b.name, b.slug, coalesce(u.email, b.email) as email, b.paid_until::text from businesses b left join users u on u.id=b.owner_user_id
    where b.status in ('claimed','pro') and b.paid_until is not null and b.paid_until <= current_date + 30 and b.renewal_mailed_at is null`);
  let mailed = 0;
  for (const b of due) {
    if (!b.email) continue;
    try {
      await sendMail(b.email, `Je profiel op ${v.brand} verloopt op ${b.paid_until}`, mailLayout(v.brand, `Verleng je profiel voor ${b.name}`, `<p>Je Geverifieerd profiel loopt af op ${b.paid_until}. Verlengen is één klik en 79,95 per jaar inclusief btw; niets doen betekent dat je profiel terugvalt naar de basisvermelding. Je foto's en teksten bewaren we.</p>`, { href: `${base}/dashboard/${b.slug}/`, label: "Verlengen via het dashboard" }), `Je profiel verloopt op ${b.paid_until}. Verlengen: ${base}/dashboard/${b.slug}/`);
      await q("update businesses set renewal_mailed_at=now() where id=$1", [b.id]); mailed++;
    } catch { /* volgende */ }
  }
  // 48 uur geen claim na een aanvraag: aanvrager doorverwijzen naar geverifieerde bedrijven in de buurt
  const stale = await q<{ lead_id: string; email: string | null; name: string; biz: string; lat: number | null; lng: number | null }>(`
    select l.id as lead_id, r.email, r.name, b.name as biz, st_y(b.geom) as lat, st_x(b.geom) as lng from leads l join lead_requests r on r.id=l.request_id join businesses b on b.id=l.business_id
    where l.teaser_sent_at < now() - interval '48 hours' and l.requester_notified_at is null and b.status='unclaimed' and b.owner_user_id is null limit 50`);
  let notified = 0;
  for (const s of stale) {
    if (!s.email) { await q("update leads set requester_notified_at=now() where id=$1", [s.lead_id]); continue; }
    const alt = s.lat && s.lng ? await q<{ name: string; slug: string; city: string | null }>("select name, slug, city from businesses where vertical_id=$1 and status in ('claimed','pro') and geom is not null and st_dwithin(geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography, 30000) order by st_distance(geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography) limit 3", [v.id, s.lat, s.lng]) : [];
    const list = alt.length ? `<ul>${alt.map((a) => `<li><a href="${base}/bedrijf/${a.slug}/">${a.name}</a>${a.city ? `, ${a.city}` : ""}</li>`).join("")}</ul>` : `<p>Zoek op de <a href="${base}/">kaart</a> naar geverifieerde ${v.name_plural} bij jou in de buurt.</p>`;
    try { await sendMail(s.email, `${s.biz} heeft nog niet gereageerd op je aanvraag`, mailLayout(v.brand, "Nog geen reactie", `<p>Hallo ${s.name},</p><p>${s.biz} heeft zijn pagina op ${v.brand} nog niet bevestigd en we hebben geen reactie gezien. Je kunt het bedrijf natuurlijk zelf bellen, maar deze geverifieerde ${v.name_plural} in de buurt reageren via ons rechtstreeks:</p>${list}`), `${s.biz} heeft nog niet gereageerd. Geverifieerde ${v.name_plural} in de buurt: ${alt.map((a) => `${base}/bedrijf/${a.slug}/`).join(" ")}`); notified++; } catch { /* volgende */ }
    await q("update leads set requester_notified_at=now() where id=$1", [s.lead_id]);
  }
  const expired = await q<{ id: string }>("update businesses set status='unclaimed', renewal_mailed_at=null, updated_at=now() where status in ('claimed','pro') and paid_until is not null and paid_until < current_date - 7 returning id");
  if (expired.length) await q("refresh materialized view place_stats").catch(() => {});
  return NextResponse.json({ ok: true, mailed, notified, expired: expired.length });
}
