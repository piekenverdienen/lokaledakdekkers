import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { authorized } from "@/lib/jobs";
import { readSite } from "@/lib/extract";
import { haikuFacts, keywordFacts } from "@/lib/facts";
export const dynamic = "force-dynamic"; export const maxDuration = 300;
// Proefrun: vijf profielen, beide methodes naast elkaar, met de kosten van Haiku.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const rows = await q<{ name: string; city: string | null; website: string }>("select name, city, website from businesses where source='kvk' and website is not null and profile_built_at is not null and status<>'hidden' order by md5(id::text) limit 5");
  const out = []; let inT = 0, outT = 0;
  for (const b of rows) {
    const site = await readSite(b.website).catch(() => null);
    if (!site) { out.push({ bedrijf: b.name, website: b.website, fout: "site niet leesbaar" }); continue; }
    const text = site.pages.map((p) => p.text).join(" ");
    const kw = keywordFacts(text); const h = await haikuFacts(b.name, site.pages.map((p) => `### ${p.url}\n${p.text}`).join("\n\n"));
    inT += h.inTok; outT += h.outTok;
    out.push({ bedrijf: b.name, plaats: b.city, website: b.website, woorden: kw, haiku: h.facts });
  }
  const euro = ((inT / 1e6) * 1 + (outT / 1e6) * 5) * 0.92;
  return NextResponse.json({ tokens_in: inT, tokens_uit: outT, kosten_euro: Math.round(euro * 1000) / 1000, profielen: out });
}
