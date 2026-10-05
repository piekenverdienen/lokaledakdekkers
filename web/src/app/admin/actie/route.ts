import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getVertical, q } from "@/lib/db";
import { getUser } from "@/lib/auth";
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
  else if (actie === "verzoek_afgehandeld") { await q("update claims set verified_at=now() where id=$1", [id]); tab = "verzoeken"; }
  await q("refresh materialized view place_stats").catch(() => {});
  revalidatePath("/", "layout");
  return NextResponse.redirect(`${base}/admin/?tab=${tab}&ok=1`, 303);
}
