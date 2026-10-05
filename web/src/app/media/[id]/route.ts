import { NextResponse } from "next/server";
import { one } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await one<{ mime: string; bytes: Buffer }>("select mime, bytes from media where id=$1", [id.replace(/\.[a-z]+$/, "")]).catch(() => null);
  if (!m) return new NextResponse("niet gevonden", { status: 404 });
  return new NextResponse(new Uint8Array(m.bytes), { headers: { "Content-Type": m.mime, "Cache-Control": "public, max-age=31536000, immutable" } });
}
