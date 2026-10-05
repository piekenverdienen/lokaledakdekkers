import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
export async function POST(req: Request) {
  const f = await req.formData();
  const slug = String(f.get("slug") ?? ""); const bericht = String(f.get("bericht") ?? "").slice(0, 2000); const email = String(f.get("email") ?? "").slice(0, 200);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const b = await one<{ id: string; name: string }>("select id, name from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  if (b && bericht.trim()) {
    const verwijderen = f.get("verwijderen") === "on";
    await q("insert into claims (business_id, email, method, code) values ($1,$2,$3,$4)", [b.id, email || "onbekend", verwijderen ? "verwijderverzoek" : "correctie", bericht.slice(0, 200)]);
    await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `${verwijderen ? "Verwijderverzoek" : "Correctie"}: ${b.name}`, mailLayout(v.brand, `${verwijderen ? "Verwijderverzoek" : "Correctie"} voor ${b.name}`, `<p>${bericht.replace(/</g, "&lt;")}</p><p>Van: ${email || "onbekend"}</p><p>Profiel: ${base}/bedrijf/${slug}/</p><p><a href="${base}/admin/?tab=verzoeken">Afhandelen in het beheerscherm</a></p>`), `${bericht}\n\nVan: ${email}\n${base}/bedrijf/${slug}/`);
  }
  return NextResponse.redirect(`${base}/corrigeren/${slug}/?status=sent`, 303);
}
