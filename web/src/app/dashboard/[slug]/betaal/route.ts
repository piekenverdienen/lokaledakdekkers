import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
import { createPayment, mollieEnabled } from "@/lib/mollie";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  if (!mollieEnabled()) return NextResponse.redirect(`${base}/dashboard/${slug}/?fout=betalen`, 303);
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const webhookBase = process.env.WEBHOOK_BASE_URL ?? base;
  let p: Awaited<ReturnType<typeof createPayment>>;
  try { p = await createPayment({
    amountCents: price,
    description: `${v.brand}: Geverifieerd profiel ${b.name}, 1 jaar`,
    redirectUrl: `${base}/dashboard/${slug}/?betaald=1`,
    webhookUrl: `${webhookBase}/api/mollie/webhook/`,
    metadata: { business_id: b.id, slug, kind: "verified_year" },
  }); } catch (e) { console.error("betaal:", (e as Error).message); return NextResponse.redirect(`${base}/dashboard/${slug}/?fout=betalen`, 303); }
  await q("insert into payments (business_id, provider_id, kind, amount_cents, status) values ($1,$2,'verified_year',$3,$4)", [b.id, p.id, price, p.status]);
  return NextResponse.redirect(p._links.checkout.href, 303);
}
