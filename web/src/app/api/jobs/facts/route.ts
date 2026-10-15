import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { authorized } from "@/lib/jobs";
import { readSite } from "@/lib/extract";
import { haikuFacts } from "@/lib/facts";
import { isDirectory } from "@/lib/directories";
export const dynamic = "force-dynamic"; export const maxDuration = 300;
// Vult de vaste feiten per profiel. ?demo=1 doet de vijf proefprofielen, anders de volgende portie zonder feiten.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const u = new URL(req.url); const demo = u.searchParams.get("demo") === "1"; const limit = Math.min(10, parseInt(u.searchParams.get("limit") ?? "4", 10) || 4);
  const rows = await q<{ id: string; name: string; slug: string; website: string; city: string | null }>(demo
    ? "select id, name, slug, website, city from businesses where source='kvk' and website is not null and profile_built_at is not null and status<>'hidden' order by md5(id::text) limit 5"
    : "select id, name, slug, website, city from businesses where source<>'test' and website is not null and profile_built_at is not null and status<>'hidden' and facts_at is null and not facts_by_owner order by (owner_user_id is not null) desc, (outreach_email is not null) desc, id limit $1", demo ? [] : [limit]);
  const done: string[] = []; let inT = 0, outT = 0;
  for (const b of rows) {
    if (isDirectory(b.website)) { await q("update businesses set facts_at=now() where id=$1", [b.id]); continue; }
    const site = await readSite(b.website).catch(() => null);
    if (!site) { await q("update businesses set facts_at=now() where id=$1", [b.id]); continue; }
    const h = await haikuFacts(b.name, site.pages.map((p) => `### ${p.url}\n${p.text}`).join("\n\n")); inT += h.inTok; outT += h.outTok;
    if (!h.facts) { await q("update businesses set facts_at=now() where id=$1", [b.id]); continue; }
    // werkgebied: alleen kernen die bestaan en binnen 40 km van de vestiging liggen
    const kernen: string[] = [];
    for (const k of h.facts.kernen) {
      const hit = await one<{ name: string }>("select p.name from places p, businesses b where b.id=$1 and lower(p.name)=lower($2) and b.geom is not null and st_dwithin(p.geom::geography, b.geom::geography, 40000) order by p.population desc nulls last limit 1", [b.id, k.trim()]);
      if (hit && !kernen.includes(hit.name)) kernen.push(hit.name);
    }
    const facts = { ...h.facts, kernen };
    await q("update businesses set facts=$2, facts_at=now(), founded_year=coalesce(founded_year, $3) where id=$1 and not facts_by_owner", [b.id, JSON.stringify(facts), facts.sinds]);
    done.push(`/bedrijf/${b.slug}/`);
  }
  const left = (await one<{ n: number }>("select count(*)::int as n from businesses where source<>'test' and website is not null and profile_built_at is not null and status<>'hidden' and facts_at is null"))?.n ?? 0;
  return NextResponse.json({ ok: true, done, left, euro: Math.round(((inT / 1e6) + (outT / 1e6) * 5) * 0.92 * 1000) / 1000 });
}
