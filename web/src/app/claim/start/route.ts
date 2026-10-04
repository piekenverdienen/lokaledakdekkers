import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { getVertical, one, q } from "@/lib/db";
import { createMagicLink, domainsMatch, mailLayout, sendMail } from "@/lib/auth";

export async function POST(req: Request) {
  const f = await req.formData();
  const slug = String(f.get("slug") ?? ""); const email = String(f.get("email") ?? "").trim().toLowerCase();
  const method = String(f.get("method") ?? "email"); const code = String(f.get("code") ?? "").trim();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const b = await one<{ id: string; name: string; website: string | null; status: string }>("select id, name, website, status from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  if (!b || b.status !== "unclaimed" || !email.includes("@")) return NextResponse.redirect(`${base}/claim/${slug}/`, 303);
  const back = (s: string) => NextResponse.redirect(`${base}/claim/${slug}/?status=${s}&email=${encodeURIComponent(email)}`, 303);

  // maximaal 3 pogingen per bedrijf per 24 uur
  const n = await one<{ n: number }>("select count(*)::int as n from claims where business_id=$1 and created_at > now() - interval '24 hours'", [b.id]);
  if ((n?.n ?? 0) >= 6) return back("mismatch");

  if (method === "code") {
    const c = await one<{ id: string }>("select id from claims where business_id=$1 and method='kvk_letter' and code=$2 and verified_at is null and created_at > now() - interval '60 days'", [b.id, code]);
    if (!c) return back("mismatch");
    await q("update claims set verified_at=now(), email=$2 where id=$1", [c.id, email]);
    const token = await createMagicLink(email, "claim", { business_id: b.id, slug });
    await sendMail(email, `Je profiel op ${v.brand} claimen`, mailLayout(v.brand, `Claim ${b.name}`, `<p>Klik op de knop om je profiel te claimen en direct in te loggen.</p>`, { href: `${base}/auth/verify/?token=${token}`, label: "Claim mijn profiel" }), `Claim je profiel: ${base}/auth/verify/?token=${token}`);
    return back("sent");
  }
  if (method === "letter" || !b.website) {
    const c = String(randomInt(100000, 999999));
    await q("insert into claims (business_id, email, method, code) values ($1,$2,'kvk_letter',$3)", [b.id, email, c]);
    await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `Brief met code sturen: ${b.name}`, mailLayout(v.brand, "Claim via brief", `<p>${b.name} (${slug}) vraagt een claim via brief. Code: <b>${c}</b>. Aanvrager: ${email}. Stuur de brief naar het KvK-vestigingsadres.</p>`), `Brief met code ${c} sturen naar ${b.name}; aanvrager ${email}`);
    return back("letter");
  }
  if (!domainsMatch(email, b.website)) {
    await q("insert into claims (business_id, email, method) values ($1,$2,'email_domain_mismatch')", [b.id, email]);
    return back("mismatch");
  }
  await q("insert into claims (business_id, email, method) values ($1,$2,'email_domain')", [b.id, email]);
  const token = await createMagicLink(email, "claim", { business_id: b.id, slug });
  const link = `${base}/auth/verify/?token=${token}`;
  await sendMail(email, `Je profiel op ${v.brand} claimen`, mailLayout(v.brand, `Claim ${b.name}`, `<p>Klik op de knop om te bevestigen dat ${b.name} jouw bedrijf is. Je bent dan direct ingelogd en kunt je profiel laten opbouwen uit je website.</p><p>De link werkt 30 minuten.</p>`, { href: link, label: "Claim mijn profiel" }), `Claim je profiel: ${link}`);
  return back("sent");
}
