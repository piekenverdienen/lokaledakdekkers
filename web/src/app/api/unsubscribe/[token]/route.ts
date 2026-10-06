import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
// One-click afmelden (RFC 8058) voor de afmeldknop van Gmail en Outlook; GET stuurt door naar de gewone pagina.
async function optOut(token: string) {
  const o = await one<{ business_id: string }>("select business_id from outreach where token=$1", [token]);
  if (o) await q("update businesses set outreach_opt_out=true where id=$1", [o.business_id]);
}
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) { const { token } = await params; await optOut(token); return new NextResponse("ok"); }
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) { const { token } = await params; return NextResponse.redirect(new URL(`/uitschrijven/${token}/`, req.url), 303); }
