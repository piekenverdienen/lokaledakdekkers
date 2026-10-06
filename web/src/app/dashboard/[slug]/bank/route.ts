import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
import { ownedBusiness } from "@/lib/owned";
// "Ik heb overgemaakt": registreert een open bankbetaling met kenmerk en waarschuwt de beheerder.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const existing = await one<{ provider_id: string }>("select provider_id from payments where business_id=$1 and provider='bank' and status='open'", [b.id]);
  const ref = existing?.provider_id ?? `LD-${slug.slice(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  if (!existing) await q("insert into payments (business_id, provider, provider_id, kind, amount_cents, status) values ($1,'bank',$2,'verified_year',$3,'open')", [b.id, ref, price]);
  await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `Bankbetaling gemeld: ${b.name} (${ref})`, mailLayout(v.brand, "Overschrijving gemeld", `<p>${b.name} zegt ${(price / 100).toFixed(2).replace(".", ",")} euro te hebben overgemaakt met kenmerk <b>${ref}</b>. Controleer de bank en bevestig in het beheerscherm.</p>`, { href: `${base}/admin/?tab=betalingen`, label: "Naar betalingen" }), `Bankbetaling gemeld door ${b.name}, kenmerk ${ref}`).catch(() => {});
  return NextResponse.redirect(`${base}/dashboard/${slug}/?bank=gemeld`, 303);
}
