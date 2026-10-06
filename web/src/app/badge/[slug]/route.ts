import { getBusiness } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const dynamic = "force-dynamic";
// Badge voor op de eigen website van het bedrijf: alleen voor geverifieerde (betaalde) profielen.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const v = await currentVertical(); const b = await getBusiness(slug, v.id);
  const ok = !!b && (b.status === "claimed" || b.status === "pro");
  const svg = ok
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64"><rect width="240" height="64" rx="12" fill="#142E3A"/><rect x="12" y="14" width="36" height="36" rx="9" fill="#F5F1E9"/><path d="M15 36l6-7 6 7" stroke="#142E3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M24 35l6-8 6 8" stroke="#C76B46" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M33 36l6-7 6 7" stroke="#142E3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/><text x="60" y="30" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#fff">Geverifieerd bedrijf</text><text x="60" y="47" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#E2B59E">${v.domain}</text><path d="M206 25l6 6 10-11" fill="none" stroke="#5BD38B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
