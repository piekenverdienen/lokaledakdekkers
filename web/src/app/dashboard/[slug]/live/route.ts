import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
import { revalidatePath } from "next/cache";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  if (b.status === "unclaimed") {
    await q("update businesses set status='claimed', reviewed=true, updated_at=now() where id=$1", [b.id]);
    await q("refresh materialized view concurrently place_stats").catch(() => q("refresh materialized view place_stats"));
    revalidatePath("/", "layout");
  }
  return NextResponse.redirect(`${base}/dashboard/${slug}/?live=1`, 303);
}
