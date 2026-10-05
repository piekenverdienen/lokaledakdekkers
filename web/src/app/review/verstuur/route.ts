import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { createMagicLink, mailLayout, sendMail } from "@/lib/auth";
export async function POST(req: Request) {
  const f = await req.formData();
  const slug = String(f.get("slug") ?? ""); const email = String(f.get("email") ?? "").trim().toLowerCase();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const b = await one<{ id: string; name: string }>("select id, name from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  const score = parseInt(String(f.get("score") ?? "0"), 10); const body = String(f.get("body") ?? "").replace(/—|–/g, ",").trim().slice(0, 2000);
  const name = String(f.get("name") ?? "").trim().slice(0, 80); const service = String(f.get("service") ?? "") || null; const invoice = String(f.get("invoice") ?? "").trim().slice(0, 120) || null;
  if (!b || !email.includes("@") || score < 1 || score > 5 || body.length < 40 || !name) return NextResponse.redirect(`${base}/review/${slug}/`, 303);
  const recent = await one<{ n: number }>("select count(*)::int as n from reviews where business_id=$1 and email=$2 and created_at > now() - interval '30 days'", [b.id, email]);
  if ((recent?.n ?? 0) > 0) return NextResponse.redirect(`${base}/review/${slug}/?status=sent`, 303);
  const r = await one<{ id: string }>("insert into reviews (business_id, name, email, score, body, service_slug, invoice_ref, status) values ($1,$2,$3,$4,$5,$6,$7,'pending') returning id", [b.id, name, email, score, body, service, invoice]);
  const token = await createMagicLink(email, "review", { review_id: r!.id, slug }, 60 * 24);
  const link = `${base}/auth/verify/?token=${token}`;
  await sendMail(email, `Bevestig je review over ${b.name}`, mailLayout(v.brand, "Bevestig je review", `<p>Klik op de knop om te bevestigen dat jij deze review hebt geschreven. Daarna plaatsen we hem binnen een werkdag.</p>`, { href: link, label: "Review bevestigen" }), `Bevestig je review: ${link}`);
  return NextResponse.redirect(`${base}/review/${slug}/?status=sent`, 303);
}
