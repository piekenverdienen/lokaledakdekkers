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
  const expired = await q<{ id: string }>("update businesses set status='unclaimed', renewal_mailed_at=null, updated_at=now() where status in ('claimed','pro') and paid_until is not null and paid_until < current_date - 7 returning id");
  if (expired.length) await q("refresh materialized view place_stats").catch(() => {});
  return NextResponse.json({ ok: true, mailed, expired: expired.length });
}
