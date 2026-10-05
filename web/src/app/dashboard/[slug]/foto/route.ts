import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData(); const url = String(f.get("url") ?? ""); const actie = String(f.get("actie") ?? "verwijder");
  if (actie === "verwijder" && url) {
    await q("delete from business_photos where business_id=$1 and url=$2", [b.id, url]);
    const id = url.match(/^\/media\/([0-9a-f-]+)/)?.[1]; if (id) await q("delete from media where id=$1 and business_id=$2", [id, b.id]);
  } else if (actie === "logo_weg") {
    await q("update businesses set logo_url=null, updated_at=now() where id=$1", [b.id]);
  } else if (actie === "eerst" && url) {
    await q("update business_photos set sort_order=sort_order+1 where business_id=$1", [b.id]);
    await q("update business_photos set sort_order=0 where business_id=$1 and url=$2", [b.id, url]);
  }
  revalidatePath(`/bedrijf/${slug}`);
  return NextResponse.redirect(`${base}/dashboard/${slug}/#fotos`, 303);
}
