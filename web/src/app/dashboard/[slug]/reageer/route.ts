import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData(); const id = String(f.get("review") ?? ""); const reply = String(f.get("reply") ?? "").replace(/—|–/g, ",").trim().slice(0, 600);
  await q("update reviews set reply=$3, replied_at=case when $3='' then null else now() end where id=$1 and business_id=$2", [id, b.id, reply]);
  revalidatePath(`/bedrijf/${slug}`);
  return NextResponse.redirect(`${base}/dashboard/${slug}/#reviews`, 303);
}
