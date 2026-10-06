import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getVertical } from "@/lib/db";
import { segmentRows } from "@/lib/funnel";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const user = await getUser(); if (!user?.is_admin) return new NextResponse("nee", { status: 403 });
  const v = await getVertical(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
  const u = new URL(req.url); const seg = u.searchParams.get("seg") ?? "warm"; const regio = u.searchParams.get("regio") ?? "";
  const rows = await segmentRows(v.id, seg, regio, 5000);
  const esc = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  const head = ["bedrijf", "plaats", "provincie", "email", "telefoon", "verstuurd", "geopend", "geklikt", "geclaimd", "status", "betaald_tot", "aanvragen", "profiel"];
  const body = rows.map((r) => [r.name, r.city, r.provincie, r.email, r.phone, r.sent_at?.slice(0, 10), r.opened_at?.slice(0, 10), r.clicked_at?.slice(0, 10), r.claimed ? "ja" : "nee", r.status, r.paid_until, r.leads, `https://${v.domain}/bedrijf/${r.slug}/`].map(esc).join(";"));
  return new NextResponse("\ufeff" + [head.join(";"), ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lokaledakdekkers-${seg}${regio ? "-" + regio : ""}.csv"` } });
}
