import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
// Afmelden alleen via POST: de knop op de afmeldpagina, of de one-click-knop van Gmail en Outlook (RFC 8058).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let via = "one-click"; try { const f = await req.formData(); if (f.get("via") === "pagina") via = "pagina"; } catch { /* one-click stuurt List-Unsubscribe=One-Click */ }
  const o = await one<{ business_id: string }>("select business_id from outreach where token=$1", [token]);
  if (o) await q("update businesses set outreach_opt_out=true, outreach_opt_out_at=coalesce(outreach_opt_out_at, now()), outreach_opt_out_via=coalesce(outreach_opt_out_via, $2) where id=$1", [o.business_id, via]);
  if (via === "pagina") return NextResponse.redirect(new URL(`/uitschrijven/${token}/?ok=1`, req.url), 303);
  return new NextResponse("ok");
}
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) { const { token } = await params; return NextResponse.redirect(new URL(`/uitschrijven/${token}/`, req.url), 303); }
