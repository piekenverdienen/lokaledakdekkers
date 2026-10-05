import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData(); const av = String(f.get("availability") ?? "available"); const from = String(f.get("available_from") ?? "").trim().slice(0, 40) || null;
  if (["available", "from", "full"].includes(av)) await q("update businesses set availability=$2, available_from=$3, updated_at=now() where id=$1", [b.id, av, av === "available" ? null : from]);
  revalidatePath(`/bedrijf/${slug}`);
  return NextResponse.redirect(`${base}/dashboard/${slug}/#beschikbaar`, 303);
}
