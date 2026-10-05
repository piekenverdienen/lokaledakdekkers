import { NextResponse } from "next/server";
import { getVertical, one, q } from "@/lib/db";
import { createMagicLink, mailLayout, sendMail } from "@/lib/auth";
import { verifyClaim } from "@/lib/verify";

export const maxDuration = 60;

export async function POST(req: Request) {
  const f = await req.formData();
  const slug = String(f.get("slug") ?? ""); const email = String(f.get("email") ?? "").trim().toLowerCase();
  let website = String(f.get("website") ?? "").trim();
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const b = await one<{ id: string; name: string; kvk_number: string | null; status: string }>("select id, name, kvk_number, status from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  const back = (s: string, extra: Record<string, string> = {}) => NextResponse.redirect(`${base}/claim/${slug}/?${new URLSearchParams({ status: s, email, website, ...extra })}`, 303);
  if (!b || b.status !== "unclaimed" || !email.includes("@") || !website) return back("site");
  const n = await one<{ n: number }>("select count(*)::int as n from claims where business_id=$1 and created_at > now() - interval '24 hours'", [b.id]);
  if ((n?.n ?? 0) >= 8) return back("limiet");

  const r = await verifyClaim(website, email, b.name, b.kvk_number);
  await q("insert into claims (business_id, email, method, code) values ($1,$2,$3,$4)", [b.id, email, r.ok ? "website_email" : `afgewezen_${r.reason}`, website.slice(0, 200)]);
  if (!r.ok) return back(r.reason, r.reason === "email" ? { domain: r.domain } : {});

  await q("update businesses set website=coalesce(website,$2) where id=$1", [b.id, website]);
  const token = await createMagicLink(email, "claim", { business_id: b.id, slug, website });
  const link = `${base}/auth/verify/?token=${token}`;
  await sendMail(email, `Claim ${b.name} op ${v.brand}`, mailLayout(v.brand, `Jouw inloglink voor ${b.name}`, `<p>Klik op de knop om in te loggen. We bouwen dan je profiel op uit ${website.replace(/^https?:\/\//, "")}; jij kijkt het na en zet het online.</p><p>De link werkt 30 minuten.</p>`, { href: link, label: "Inloggen en profiel bekijken" }), `Inloggen: ${link}`);
  return back("sent");
}
