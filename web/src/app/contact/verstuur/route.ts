import { NextResponse } from "next/server";
import { createHash, createHmac } from "node:crypto";
import { getVertical, one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));
export async function POST(req: Request) {
  const f = await req.formData();
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const bot = String(f.get("website2") ?? "").trim().length > 0;
  if (bot) return NextResponse.redirect(`${base}/contact/?status=sent`, 303);
  const a = parseInt(String(f.get("captcha_a")), 10), b = parseInt(String(f.get("captcha_b")), 10), ans = parseInt(String(f.get("captcha")), 10);
  const sig = createHmac("sha256", process.env.SESSION_SECRET ?? "x").update(`${a}+${b}=${a + b}`).digest("hex").slice(0, 24);
  if (sig !== String(f.get("captcha_sig")) || ans !== a + b) return NextResponse.redirect(`${base}/contact/?status=captcha`, 303);
  const name = String(f.get("name") ?? "").trim().slice(0, 100), email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 150), topic = String(f.get("topic") ?? "").slice(0, 80), message = String(f.get("message") ?? "").trim().slice(0, 4000);
  if (!name || !email.includes("@") || message.length < 10) return NextResponse.redirect(`${base}/contact/?status=fout`, 303);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""; const ipHash = createHash("sha256").update(ip + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
  const recent = await one<{ n: number }>("select count(*)::int as n from claims where method='contact' and code=$1 and created_at > now() - interval '1 hour'", [ipHash]);
  if ((recent?.n ?? 0) >= 5) return NextResponse.redirect(`${base}/contact/?status=sent`, 303);
  await q("insert into claims (business_id, email, method, code) values (null,$1,'contact',$2)", [email, ipHash]).catch(() => {});
  const html = `<p><b>${esc(topic)}</b></p><p>${esc(message).replace(/\n/g, "<br>")}</p><p style="color:#5A6975">Van: ${esc(name)}, ${esc(email)}</p>`;
  await sendMail(`info@${v.domain}`, `Contact via ${v.brand}: ${topic}`, mailLayout(v.brand, `Bericht van ${name}`, html), `${topic}\n\n${message}\n\nVan: ${name}, ${email}`);
  await sendMail(email, `Je bericht aan ${v.brand}`, mailLayout(v.brand, "We hebben je bericht ontvangen", `<p>We reageren binnen twee werkdagen. Dit is wat je stuurde:</p>${html}`), `We hebben je bericht ontvangen:\n\n${message}`).catch(() => {});
  return NextResponse.redirect(`${base}/contact/?status=sent`, 303);
}
