import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
import { ownedBusiness } from "@/lib/owned";
// Reviewuitnodigingen: tot 5 adressen per keer, 20 per dag, met de reviewlink van het bedrijf.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData();
  const emails = String(f.get("emails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)).slice(0, 5);
  const note = String(f.get("note") ?? "").trim().slice(0, 300);
  const today = (await one<{ n: number }>("select count(*)::int as n from review_invites where business_id=$1 and sent_at::date=current_date", [b.id]))?.n ?? 0;
  let sent = 0;
  for (const e of emails) {
    if (today + sent >= 20) break;
    const dup = await one("select 1 from review_invites where business_id=$1 and email=$2 and sent_at > now() - interval '30 days'", [b.id, e]); if (dup) continue;
    try {
      await sendMail(e, `${b.name} vraagt je om een korte review`, mailLayout(v.brand, `Hoe was je ervaring met ${b.name}?`, `<p>${b.name} heeft werk voor je gedaan en vraagt of je een korte review wilt achterlaten op ${v.brand}. Het kost twee minuten en helpt anderen een goede ${v.name_singular} te vinden.</p>${note ? `<p style="border-left:3px solid #F2B33D;padding-left:12px;color:#5A6975">${note.replace(/</g, "&lt;")}</p>` : ""}<p style="color:#5A6975;font-size:13px">Je review wordt pas geplaatst nadat je hem per e-mail hebt bevestigd. Heb je een factuur, vul dan het factuurnummer in; dan krijgt je review het label Geverifieerde klus.</p>`, { href: `${base}/review/${slug}/`, label: "Review schrijven" }), `${b.name} vraagt je om een review: ${base}/review/${slug}/`);
      await q("insert into review_invites (business_id, email) values ($1,$2)", [b.id, e]); sent++;
    } catch { /* volgende */ }
  }
  return NextResponse.redirect(`${base}/dashboard/${slug}/?uitnodigingen=${sent}#reviews`, 303);
}
