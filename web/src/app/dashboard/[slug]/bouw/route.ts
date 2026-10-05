import { NextResponse } from "next/server";
import { buildProfile } from "@/lib/build";
import { ownedBusiness } from "@/lib/owned";
export const maxDuration = 60;
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { v, base, user, b } = await ownedBusiness(req, slug);
  if (!user || !b) return NextResponse.redirect(`${base}/dashboard/`, 303);
  const f = await req.formData();
  const website = String(f.get("website") ?? b.website ?? "").trim();
  if (!website) return NextResponse.redirect(`${base}/dashboard/${slug}/?fout=site`, 303);
  const n = await buildProfile(v, b.id, slug, website);
  return NextResponse.redirect(`${base}/dashboard/${slug}/?${n ? `gebouwd=${n}` : "fout=site"}`, 303);
}
