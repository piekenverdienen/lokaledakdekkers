import { NextResponse } from "next/server";
import { getVertical, one } from "@/lib/db";
import { createMagicLink, mailLayout, sendMail } from "@/lib/auth";
export async function POST(req: Request) {
  const f = await req.formData();
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  // alleen mailen als dit adres een bedrijf of account heeft; anders stil dezelfde melding tonen
  const known = await one("select 1 from users where email=$1 union select 1 from businesses where owner_user_id is not null and email=$1", [email]);
  if (known && email.includes("@")) {
    const token = await createMagicLink(email, "login");
    const link = `${base}/auth/verify/?token=${token}`;
    await sendMail(email, `Inloggen bij ${v.brand}`, mailLayout(v.brand, "Je inloglink", `<p>Klik op de knop om in te loggen. De link werkt 30 minuten.</p>`, { href: link, label: "Inloggen" }), `Inloggen: ${link}`);
  }
  return NextResponse.redirect(`${base}/dashboard/?status=sent`, 303);
}
