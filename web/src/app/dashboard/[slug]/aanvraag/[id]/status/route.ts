import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const status = String((await req.formData()).get("status") ?? "new");
  if (["new", "contacted", "quoted", "won", "lost"].includes(status)) await q("update leads set status=$3 where id=$1 and business_id=$2", [id, b.id, status]);
  return NextResponse.redirect(`${base}/dashboard/${slug}/aanvraag/${id}/`, 303);
}
