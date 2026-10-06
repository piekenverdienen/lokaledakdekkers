import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
// Meetpixel in de claimmail: registreert de eerste keer openen.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await q("update outreach set opened_at=coalesce(opened_at, now()) where token=$1", [token.replace(/\.gif$/, "")]).catch(() => {});
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
