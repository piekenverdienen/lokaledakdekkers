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
  const user = await upsertUser(ml.user_email);
  let target = `${base}/dashboard/`;
  if (ml.purpose === "claim" && ml.payload.business_id) {
    const b = await one<{ slug: string; status: string }>("select slug, status from businesses where id=$1", [ml.payload.business_id]);
    if (b && b.status === "unclaimed") {
      await q("update businesses set owner_user_id=$2, claimed_at=now(), email=coalesce(email,$3) where id=$1", [ml.payload.business_id, user.id, ml.user_email]);
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
