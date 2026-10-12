import { NextResponse } from "next/server";
import { authorized } from "@/lib/jobs";
export const dynamic = "force-dynamic";
// Controleert of de API-sleutels werken, zonder kosten (alleen leesaanroepen). Toont nooit de sleutel zelf.
async function ok(url: string, headers: Record<string, string>) {
  try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(6000) }); return r.ok ? "werkt" : `fout ${r.status}`; } catch (e) { return `geen verbinding (${(e as Error).message.slice(0, 40)})`; }
}
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const e = process.env;
  return NextResponse.json({
    anthropic: e.ANTHROPIC_API_KEY ? await ok("https://api.anthropic.com/v1/models", { "x-api-key": e.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }) : "ontbreekt",
    resend: e.RESEND_API_KEY ? await ok("https://api.resend.com/domains", { Authorization: `Bearer ${e.RESEND_API_KEY}` }) : "ontbreekt",
    mollie: e.MOLLIE_API_KEY ? await ok("https://api.mollie.com/v2/methods", { Authorization: `Bearer ${e.MOLLIE_API_KEY}` }) : "ontbreekt",
    overheid: e.OVERHEID_IO_KEY ? await ok("https://api.overheid.io/v3/openkvk?size=1", { "ovio-api-key": e.OVERHEID_IO_KEY }) : "ontbreekt",
    serper: e.SERPER_API_KEY ? "aanwezig (niet getest, test kost een zoekopdracht)" : "ontbreekt",
  });
}
