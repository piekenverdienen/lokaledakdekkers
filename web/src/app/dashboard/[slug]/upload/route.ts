import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { one, q } from "@/lib/db";
import { ownedBusiness } from "@/lib/owned";
export const maxDuration = 60;

async function shrink(buf: Buffer, maxW: number) {
  const sharp = (await import("sharp")).default;
  const img = sharp(buf, { failOn: "none" }).rotate();
  const meta = await img.metadata();
  const out = await img.resize({ width: maxW, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  return { bytes: out.data, width: out.info.width, height: out.info.height, orig: meta };
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData();
  const kind = String(f.get("kind") ?? "photo") === "logo" ? "logo" : "photo";
  const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
  const max = b.status === "pro" ? 30 : 6;
  const current = (await one<{ n: number }>("select count(*)::int as n from business_photos where business_id=$1", [b.id]))?.n ?? 0;
  let added = 0, skipped = 0;
  for (const file of files) {
    if (file.size > 15 * 1024 * 1024 || !/^image\//.test(file.type)) { skipped++; continue; }
    if (kind === "photo" && current + added >= max) { skipped++; continue; }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const s = await shrink(buf, kind === "logo" ? 600 : 1600);
      const m = await one<{ id: string }>("insert into media (business_id, kind, mime, bytes, width, height) values ($1,$2,'image/webp',$3,$4,$5) returning id", [b.id, kind, s.bytes, s.width, s.height]);
      const url = `/media/${m!.id}.webp`;
      if (kind === "logo") await q("update businesses set logo_url=$2, updated_at=now() where id=$1", [b.id, url]);
      else { await q("insert into business_photos (business_id, url, sort_order) values ($1,$2,$3)", [b.id, url, current + added]); added++; }
    } catch { skipped++; }
    if (kind === "logo") break;
  }
  await q("update businesses set updated_at=now() where id=$1", [b.id]);
  revalidatePath(`/bedrijf/${slug}`);
  return NextResponse.redirect(`${base}/dashboard/${slug}/?${kind === "logo" ? "logo=1" : `fotos=${added}`}${skipped ? `&overgeslagen=${skipped}` : ""}#fotos`, 303);
}
