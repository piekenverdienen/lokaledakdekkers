import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { q } from "@/lib/db";
export const dynamic = "force-dynamic";
// Cookieloze teller: pad + dag + anonieme bezoekerhash (ip + browser + dag, niet terug te herleiden en morgen anders).
export async function POST(req: Request) {
  let path = ""; let slug: string | null = null;
  try { const body = await req.json(); path = String(body.p ?? "").slice(0, 200); } catch { return new NextResponse("", { status: 204 }); }
  if (!path.startsWith("/") || path.startsWith("/api/") || path.startsWith("/dashboard") || path.startsWith("/admin")) return new NextResponse("", { status: 204 });
  const m = path.match(/^\/bedrijf\/([a-z0-9-]+)\//); if (m) slug = m[1];
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""; const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|slurp|preview|lighthouse/i.test(ua)) return new NextResponse("", { status: 204 });
  const day = new Date().toISOString().slice(0, 10);
  const visitor = createHash("sha256").update(`${ip}|${ua}|${day}|${process.env.SESSION_SECRET ?? ""}`).digest("hex").slice(0, 24);
  try {
    const fresh = await q<{ ok: number }>("insert into page_view_visitors (day, path, visitor) values ($1,$2,$3) on conflict do nothing returning 1 as ok", [day, path, visitor]);
    await q("insert into page_views (day, path, business_id, views, visitors) values ($1,$2,(select id from businesses where slug=$3),1,$4) on conflict (day, path) do update set views=page_views.views+1, visitors=page_views.visitors+$4", [day, path, slug, fresh.length ? 1 : 0]);
    if (slug) await q("update businesses set views_total=views_total+1 where slug=$1", [slug]);
  } catch { /* teller is best-effort */ }
  return new NextResponse("", { status: 204 });
}
