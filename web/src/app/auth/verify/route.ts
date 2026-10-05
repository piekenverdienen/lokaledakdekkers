import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { consumeMagicLink, sessionCookie, upsertUser } from "@/lib/auth";
import { buildProfile } from "@/lib/build";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const ml = await consumeMagicLink(token);
  if (!ml) return NextResponse.redirect(`${base}/dashboard/?fout=link`, 303);
  if (ml.purpose === "review" && ml.payload.review_id) {
    const r = await one<{ id: string; business_id: string; name: string; score: number; body: string }>("update reviews set email_verified_at=now() where id=$1 and email=$2 returning id, business_id, name, score, body", [ml.payload.review_id, ml.user_email]);
    if (r) {
      const bz = await one<{ name: string; slug: string }>("select name, slug from businesses where id=$1", [r.business_id]);
      const { mailLayout, sendMail } = await import("@/lib/auth");
      await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `Review ter goedkeuring: ${bz?.name}`, mailLayout(v.brand, `Nieuwe review voor ${bz?.name}`, `<p>${r.score} sterren, door ${r.name}:</p><p>${r.body.replace(/</g, "&lt;")}</p><p><a href="${base}/admin/?tab=reviews">Beoordelen in het beheerscherm</a></p>`), `${r.score} sterren door ${r.name}: ${r.body}`);
      return NextResponse.redirect(`${base}/bedrijf/${bz?.slug ?? ""}/?review=bevestigd`, 303);
    }
    return NextResponse.redirect(`${base}/?fout=link`, 303);
  }
  const user = await upsertUser(ml.user_email);
  let target = `${base}/dashboard/`;
  if (ml.purpose === "claim" && ml.payload.business_id) {
    const b = await one<{ slug: string; status: string }>("select slug, status from businesses where id=$1", [ml.payload.business_id]);
    if (b && b.status === "unclaimed") {
      await q("update businesses set owner_user_id=$2, claimed_at=now(), verified_at=now(), email=coalesce(email,$3) where id=$1", [ml.payload.business_id, user.id, ml.user_email]);
      await q("update claims set verified_at=now() where business_id=$1 and email=$2 and verified_at is null", [ml.payload.business_id, ml.user_email]);
      const website = typeof ml.payload.website === "string" ? ml.payload.website : null;
      let built = 0;
      if (website) built = (await buildProfile(v, String(ml.payload.business_id), b.slug, website).catch(() => 0)) ?? 0;
      target = `${base}/dashboard/${b.slug}/?welkom=1${built ? `&gebouwd=${built}` : ""}`;
    }
  }
  const res = NextResponse.redirect(target, 303);
  res.cookies.set(sessionCookie(user.id));
  return res;
}
