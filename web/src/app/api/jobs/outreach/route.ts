import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getVertical, one, q } from "@/lib/db";
import { sendMail } from "@/lib/auth";
import { authorized } from "@/lib/jobs";
import { isDirectory, emailFitsWebsite } from "@/lib/directories";
import { claimMail, infoMail, unsubHeaders, CLAIM_FROM } from "@/lib/outreach";
export const maxDuration = 120; export const dynamic = "force-dynamic";
// Verstuurt claim-mails in porties, alleen als de campagne in het beheerscherm aan staat, op werkdagen tussen 8 en 18 uur.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const on = (await one<{ value: string }>("select value from settings where key='outreach_enabled'"))?.value === "1";
  const perDaySetting = (await one<{ value: string }>("select value from settings where key='outreach_per_day'"))?.value ?? "auto";
  const startedAt = (await one<{ value: string }>("select value from settings where key='outreach_started_at'"))?.value;
  const dayNo = startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 86400000) + 1 : 1;
  const perDay = perDaySetting === "auto" ? (dayNo <= 3 ? 50 : dayNo <= 7 ? 100 : 200) : (parseInt(perDaySetting, 10) || 50);
  const infoOn = (await one<{ value: string }>("select value from settings where key='outreach_info'"))?.value === "1";
  const regions = ((await one<{ value: string }>("select value from settings where key='outreach_regions'"))?.value ?? "").split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  const nl = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Amsterdam", hour: "numeric", hour12: false, weekday: "short" }).formatToParts(new Date());
  const h = parseInt(nl.find((x) => x.type === "hour")?.value ?? "0", 10) % 24; const wdName = nl.find((x) => x.type === "weekday")?.value ?? "Mon";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wdName);
  if (!on || !process.env.RESEND_API_KEY) return NextResponse.json({ ok: true, skipped: "uit of geen mailsleutel" });
  if (wd === 0 || wd === 6 || h < 8 || h >= 18) return NextResponse.json({ ok: true, skipped: "buiten venster" });
  const sentToday = (await one<{ n: number }>("select count(*)::int as n from outreach where sent_at::date = current_date or reminder_at::date = current_date"))?.n ?? 0;
  const budget = Math.min(25, perDay - sentToday); if (budget <= 0) return NextResponse.json({ ok: true, skipped: "dagquotum bereikt" });
  const totals = (await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and status<>'hidden' and source<>'test'", [v.id]))?.n ?? 0;
  let sent = 0, reminders = 0;
  // herinneringen eerst (na 7 dagen, nog niet geclaimd)
  const rem = await q<{ id: string; token: string; email: string; name: string; city: string | null; slug: string }>(`select o.id, o.token, o.email, b.name, b.city, b.slug from outreach o join businesses b on b.id=o.business_id
    where o.kind='claim' and o.sent_at < now() - interval '7 days' and o.reminder_at is null and b.owner_user_id is null and b.status='unclaimed' and not b.outreach_opt_out order by o.sent_at limit $1`, [budget]);
  for (const r of rem) {
    const blocked = isDirectory(`https://${r.email.split("@")[1]}`) || !!(await one("select 1 from email_suppression where email=lower($1)", [r.email]));
    if (blocked) { await q("update outreach set reminder_at=now() where id=$1", [r.id]); continue; }
    const vic = (await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and city=$2 and status in ('claimed','pro')", [v.id, r.city]))?.n ?? 0;
    const m = claimMail(v, r, vic, totals, base, r.token, true);
    try { await sendMail(r.email, m.subject, m.html, m.text, { headers: unsubHeaders(base, r.token, v.domain), from: CLAIM_FROM }); await q("update outreach set reminder_at=now() where id=$1", [r.id]); reminders++; } catch { /* volgende */ }
  }
  const fresh = await q<{ id: string; name: string; city: string | null; slug: string; outreach_email: string; services: string[]; website: string | null }>(`select b.id, b.name, b.city, b.slug, b.outreach_email, b.website, coalesce((select array_agg(service_slug) from business_services s where s.business_id=b.id), '{}') as services from businesses b
    left join municipalities m on m.id=b.municipality_id left join provinces pr on pr.id=m.province_id
    where b.vertical_id=$1 and b.status='unclaimed' and b.owner_user_id is null and b.profile_built_at is not null and b.outreach_email is not null and not b.outreach_opt_out and b.source<>'test' and b.legal_class='rechtspersoon'
    and not exists (select 1 from outreach o where o.business_id=b.id) and not exists (select 1 from email_suppression es where es.email=lower(b.outreach_email))
    and (cardinality($3::text[])=0 or lower(pr.slug)=any($3) or lower(m.slug)=any($3) or lower(b.city)=any($3))
    order by random() limit $2`, [v.id, Math.max(0, budget - reminders), regions]);
  for (const b of fresh) {
    if (!emailFitsWebsite(b.outreach_email, b.website)) { await q("update businesses set outreach_email=null where id=$1", [b.id]); continue; }
    const token = randomBytes(12).toString("base64url");
    const vic = (await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and city=$2 and status in ('claimed','pro')", [v.id, b.city]))?.n ?? 0;
    const variant: "A" | "B" = Math.random() < 0.5 ? "A" : "B";
    const m = claimMail(v, b, vic, totals, base, token, false, variant);
    try { await sendMail(b.outreach_email, m.subject, m.html, m.text, { headers: unsubHeaders(base, token, v.domain), from: CLAIM_FROM }); await q("insert into outreach (business_id, email, token, sent_at, kind, variant) values ($1,$2,$3,now(),'claim',$4)", [b.id, b.outreach_email, token, variant]); sent++; } catch { /* volgende */ }
  }
  let info = 0;
  if (infoOn && sent + reminders < budget) {
    const nat = await q<{ id: string; name: string; slug: string; kvk_number: string | null; outreach_email: string; website: string | null }>(`select b.id, b.name, b.slug, b.kvk_number, b.outreach_email, b.website from businesses b
      left join municipalities m on m.id=b.municipality_id left join provinces pr on pr.id=m.province_id
      where b.vertical_id=$1 and b.status='unclaimed' and b.owner_user_id is null and b.profile_built_at is not null and b.outreach_email is not null and not b.outreach_opt_out and b.source<>'test' and b.legal_class='natuurlijk'
      and not exists (select 1 from outreach o where o.business_id=b.id) and not exists (select 1 from email_suppression es where es.email=lower(b.outreach_email))
      and (cardinality($3::text[])=0 or lower(pr.slug)=any($3) or lower(m.slug)=any($3) or lower(b.city)=any($3))
      order by random() limit $2`, [v.id, budget - sent - reminders, regions]);
    for (const b of nat) {
      if (!emailFitsWebsite(b.outreach_email, b.website)) { await q("update businesses set outreach_email=null where id=$1", [b.id]); continue; }
      const token = randomBytes(12).toString("base64url"); const m = infoMail(v, b, base, token);
      try { await sendMail(b.outreach_email, m.subject, m.html, m.text, { headers: unsubHeaders(base, token, v.domain) }); await q("insert into outreach (business_id, email, token, sent_at, kind) values ($1,$2,$3,now(),'info')", [b.id, b.outreach_email, token]); info++; } catch { /* volgende */ }
    }
  }
  return NextResponse.json({ ok: true, sent, reminders, info, sentToday: sentToday + sent + reminders, perDay, dayNo, regions });
}
