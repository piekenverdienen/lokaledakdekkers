import { getBusiness } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const dynamic = "force-dynamic";
// Badge voor op de eigen website van het bedrijf: alleen voor geverifieerde (betaalde) profielen.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const v = await currentVertical(); const b = await getBusiness(slug, v.id);
  const ok = !!b && (b.status === "claimed" || b.status === "pro");
  const svg = ok
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64" viewBox="0 0 240 64"><rect width="240" height="64" rx="12" fill="#0E2A3F"/><rect x="12" y="14" width="36" height="36" rx="9" fill="#F2B33D"/><path d="M19 32l11-9 11 9M22 31v12h16V31M28 43v-7h4v7" fill="none" stroke="#0E2A3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><text x="60" y="30" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#fff">Geverifieerd bedrijf</text><text x="60" y="47" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#F2B33D">${v.domain}</text><path d="M206 25l6 6 10-11" fill="none" stroke="#5BD38B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>`;
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
}
