import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { one, q } from "./db";

const COOKIE = "lk_session";
const secret = () => process.env.SESSION_SECRET || createHmac("sha256", "lokaal").update(process.env.DATABASE_URL ?? "dev").digest("hex");

function sign(v: string) {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export type User = { id: string; email: string; is_admin: boolean };

export async function getUser(): Promise<User | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;
  const [id, sig] = c.split(".");
  if (!id || !sig) return null;
  const expect = sign(id);
  if (expect.length !== sig.length || !timingSafeEqual(Buffer.from(expect), Buffer.from(sig))) return null;
  return one<User>("select id, email, is_admin from users where id=$1", [id]);
}

export function sessionCookie(userId: string) {
  return { name: COOKIE, value: `${userId}.${sign(userId)}`, httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 90 };
}

export async function upsertUser(email: string): Promise<User> {
  const e = email.trim().toLowerCase();
  return (await one<User>(
    "insert into users (email) values ($1) on conflict (email) do update set email=excluded.email returning id, email, is_admin", [e]))!;
}

export async function createMagicLink(email: string, purpose: "login" | "claim" | "review", payload: Record<string, unknown> = {}, minutes = 30) {
  const token = randomBytes(24).toString("base64url");
  await q("insert into magic_links (token, user_email, purpose, payload, expires_at) values ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval)",
    [token, email.trim().toLowerCase(), purpose, JSON.stringify(payload), String(minutes)]);
  return token;
}

export async function consumeMagicLink(token: string) {
  const row = await one<{ user_email: string; purpose: string; payload: Record<string, unknown> }>(
    "update magic_links set used_at=now() where token=$1 and used_at is null and expires_at > now() returning user_email, purpose, payload", [token]);
  return row;
}

export function emailDomain(email: string) {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}
export function websiteDomain(url: string | null) {
  if (!url) return "";
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}
export function domainsMatch(email: string, website: string | null) {
  const a = emailDomain(email), b = websiteDomain(website);
  return !!a && !!b && (a === b || a.endsWith("." + b) || b.endsWith("." + a));
}

export async function sendMail(to: string, subject: string, html: string, text: string, opts: { headers?: Record<string, string>; replyTo?: string } = {}) {
  const key = process.env.RESEND_API_KEY;
  const raw = (process.env.MAIL_FROM ?? "").trim();
  const from = /^[^<>]+<[^@\s<>]+@[^\s<>]+>$/.test(raw) || /^[^@\s<>]+@[^\s<>]+$/.test(raw) ? raw : "Lokale Dakdekkers <noreply@send.lokaledakdekkers.nl>";
  if (!key) {
    console.log(`[mail niet verzonden, geen RESEND_API_KEY] aan ${to}: ${subject}\n${text}`);
    return { ok: true, logged: true };
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text, ...(opts.headers ? { headers: opts.headers } : {}), reply_to: opts.replyTo ?? process.env.MAIL_REPLY_TO ?? undefined }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return { ok: r.ok, logged: false };
}

export function mailLayout(brand: string, title: string, body: string, cta?: { href: string; label: string }, footer?: string) {
  const host = process.env.PUBLIC_HOST ?? "lokaledakdekkers.nl";
  const btn = cta ? `<p style="margin:24px 0"><a href="${cta.href}" style="background:#142E3A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">${cta.label}</a></p>` : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#13202B;line-height:1.5"><p style="margin:0 0 20px"><img src="https://${host}/logo-mail.png" width="180" height="40" alt="${brand}" style="display:block;border:0;height:40px;width:180px"></p><h1 style="font-size:22px;margin:0 0 12px">${title}</h1>${body}${btn}<p style="color:#5A6975;font-size:13px;margin-top:32px">${footer ?? `Je krijgt deze mail omdat je dit adres hebt ingevuld op ${brand}. Niets aangevraagd? Dan kun je deze mail negeren.`}</p><p style="color:#8A979F;font-size:12px;margin-top:8px">${brand} is een dienst van Rombots Digital B.V.</p></div>`;
}
