import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getVertical, one, q } from "@/lib/db";
import { mailLayout, sendMail } from "@/lib/auth";
export const maxDuration = 60;
const WHEN: Record<string, string> = { spoed: "Spoed, er lekt iets", "2weken": "Binnen 2 weken", "3maanden": "Binnen 3 maanden", orienterend: "Oriënterend, geen haast" };
const ROOF: Record<string, string> = { hellend: "Hellend dak", plat: "Plat dak", beide: "Hellend en plat", onbekend: "Onbekend" };
const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!));

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""; const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const f = await req.formData();
  const bot = String(f.get("website2") ?? "").trim().length > 0;
  if (bot) return NextResponse.redirect(`${base}/bedrijf/${slug}/?offerte=sent#offerte`, 303);
  const b = await one<{ id: string; name: string; email: string | null; status: string; place_id: number | null; owner_user_id: string | null; outreach_email: string | null; profile_built_at: string | null; city: string | null; slug: string }>("select id, name, email, status, place_id, owner_user_id, outreach_email, profile_built_at, city, slug from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  const g = (k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);
  const name = g("name", 80), phone = g("phone", 40), email = g("email", 120).toLowerCase(), description = g("description", 3000), address = g("address", 200);
  const live = !!b && (b.status === "claimed" || b.status === "pro" || !!b.owner_user_id);
  const teaser = !!b && !live && !!b.profile_built_at && !!b.outreach_email;
  if (!b || b.status === "hidden" || (!live && !teaser) || (live && !b.email) || !name || !phone || !email.includes("@") || description.length < 30 || !address) return NextResponse.redirect(`${base}/bedrijf/${slug}/?offerte=fout#offerte`, 303);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""; const ipHash = createHash("sha256").update(ip + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
  const recent = await one<{ n: number }>("select count(*)::int as n from lead_requests where ip_hash=$1 and created_at > now() - interval '1 hour'", [ipHash]);
  if ((recent?.n ?? 0) >= 3) return NextResponse.redirect(`${base}/bedrijf/${slug}/?offerte=limiet#offerte`, 303);
  // foto's
  const urls: string[] = [];
  for (const file of f.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 4)) {
    if (file.size > 15 * 1024 * 1024 || !/^image\//.test(file.type)) continue;
    try {
      const sharp = (await import("sharp")).default;
      const out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: "none" }).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
      const m = await one<{ id: string }>("insert into media (business_id, kind, mime, bytes, width, height) values (null,'lead','image/webp',$1,$2,$3) returning id", [out.data, out.info.width, out.info.height]);
      urls.push(`${base}/media/${m!.id}.webp`);
    } catch { /* overslaan */ }
  }
  const service = g("service", 60) || null, roof = g("roof_type", 20), when = g("wanted_when", 20), pref = g("contact_pref", 20); const size = parseInt(g("size_m2", 6), 10) || null;
  const r = await one<{ id: string }>("insert into lead_requests (vertical_id, kind, name, phone, email, place_id, service_slug, description, photo_urls, wanted_when, ip_hash, roof_type, size_m2, address, contact_pref) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id",
    [v.id, when === "spoed" ? "emergency" : "quote", name, phone, email, b.place_id, service, description, urls, when, ipHash, roof, size, address, pref]);
  await q("insert into leads (request_id, business_id, type) values ($1,$2,'quote')", [r!.id, b.id]);
  const serviceName = v.services.find((s) => s.slug === service)?.name ?? (service === "anders" ? "Anders of onbekend" : service ?? "");
  const rows = [["Wat", serviceName], ["Soort dak", ROOF[roof] ?? roof], ["Oppervlakte", size ? `ongeveer ${size} m2` : "niet opgegeven"], ["Wanneer", WHEN[when] ?? when], ["Adres", address], ["Naam", name], ["Telefoon", phone], ["E-mail", email], ["Voorkeur", pref]];
  const table = `<table style="border-collapse:collapse;font-size:15px">${rows.map(([k, val]) => `<tr><td style="padding:4px 12px 4px 0;color:#5A6975">${k}</td><td style="padding:4px 0"><b>${esc(val)}</b></td></tr>`).join("")}</table>`;
  const photosHtml = urls.length ? `<p><b>Foto's</b></p>${urls.map((u) => `<p><a href="${u}"><img src="${u}" style="max-width:280px;border-radius:8px" alt=""></a></p>`).join("")}` : "";
  const html = `${table}<p><b>Omschrijving</b><br>${esc(description).replace(/\n/g, "<br>")}</p>${photosHtml}`;
  const text = rows.map(([k, val]) => `${k}: ${val}`).join("\n") + `\n\nOmschrijving:\n${description}\n${urls.length ? `\nFoto's:\n${urls.join("\n")}` : ""}`;
  if (!live && teaser) {
    const place = address.split(",").pop()?.trim() ?? b.city ?? "";
    const teaserHtml = `<p>Er is zojuist een offerteaanvraag voor <b>${b.name}</b> binnengekomen via ${v.brand}:</p>
      <table style="border-collapse:collapse;font-size:15px"><tr><td style="padding:4px 12px 4px 0;color:#5A6975">Wat</td><td><b>${esc(serviceName)}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#5A6975">Soort dak</td><td><b>${esc(ROOF[roof] ?? roof)}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#5A6975">Oppervlakte</td><td><b>${size ? `ongeveer ${size} m2` : "niet opgegeven"}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#5A6975">Wanneer</td><td><b>${esc(WHEN[when] ?? when)}</b></td></tr><tr><td style="padding:4px 12px 4px 0;color:#5A6975">Plaats</td><td><b>${esc(place)}</b></td></tr>${urls.length ? `<tr><td style="padding:4px 12px 4px 0;color:#5A6975">Foto's</td><td><b>${urls.length} meegestuurd</b></td></tr>` : ""}</table>
      <p>De naam, het telefoonnummer en de volledige omschrijving zie je zodra je je pagina hebt bevestigd. Dat duurt twee minuten: website en e-mailadres invullen, nakijken, 79,95 per jaar inclusief btw. Daarna komen alle aanvragen rechtstreeks bij jou, hoeveel het er ook zijn.</p>
      <p style="color:#5A6975;font-size:13px">Reageer je niet binnen 48 uur, dan laten we de aanvrager weten dat je via ons niet bereikbaar bent en wijzen we geverifieerde ${v.name_plural} in de buurt aan.</p>`;
    await sendMail(b.outreach_email!, `${when === "spoed" ? "SPOED: " : ""}Er wacht een offerteaanvraag op ${b.name} (${serviceName}, ${place})`, mailLayout(v.brand, "Er wacht een aanvraag op je", teaserHtml, { href: `${base}/claim/${b.slug}/`, label: "Bevestig je pagina en bekijk de aanvraag" }), `Offerteaanvraag voor ${b.name}: ${serviceName}, ${place}. Bevestig je pagina om de gegevens te zien: ${base}/claim/${b.slug}/`).catch(() => {});
    await q("update leads set teaser_sent_at=now() where request_id=$1 and business_id=$2", [r!.id, b.id]);
    await sendMail(email, `Je offerteaanvraag bij ${b.name}`, mailLayout(v.brand, `Je aanvraag is doorgestuurd naar ${b.name}`, `<p>${b.name} heeft zijn pagina op ${v.brand} nog niet bevestigd. We hebben je aanvraag doorgestuurd en vragen het bedrijf te reageren. Horen we binnen 48 uur niets, dan krijg je van ons een mail met geverifieerde ${v.name_plural} bij jou in de buurt.</p>${html}`), text);
    await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `Lead (teaser): ${b.name} (${serviceName})`, mailLayout(v.brand, `Offerteaanvraag voor niet-geclaimd ${b.name}`, html), text).catch(() => {});
    return NextResponse.redirect(`${base}/bedrijf/${slug}/?offerte=sent#offerte`, 303);
  }
  if (b.email) await sendMail(b.email, `${when === "spoed" ? "SPOED: " : ""}Offerteaanvraag via ${v.brand}: ${serviceName} in ${address.split(",").pop()?.trim() ?? ""}`, mailLayout(v.brand, `Nieuwe offerteaanvraag voor ${b.name}`, `<p>Deze aanvraag is alleen naar jou gestuurd. Reageer het liefst vandaag; bel of app ${name} op ${esc(phone)}.</p>${html}<p style="margin-top:20px"><a href="${base}/dashboard/${slug}/#aanvragen">Alle aanvragen in je dashboard</a></p>`), text);
  await sendMail(email, `Je offerteaanvraag bij ${b.name}`, mailLayout(v.brand, `Je aanvraag is verstuurd naar ${b.name}`, `<p>Dit is wat we hebben doorgestuurd. Geen reactie binnen twee werkdagen? Bel het bedrijf even.</p>${html}<p style="margin-top:20px;font-size:13px;color:#5A6975">Tip: vraag altijd een schriftelijke offerte met vaste prijs, en betaal nooit vooraf het volledige bedrag.</p>`), text);
  await sendMail(process.env.ADMIN_EMAIL ?? "paul@yourfellow.nl", `Lead: ${b.name} (${serviceName})`, mailLayout(v.brand, `Offerteaanvraag voor ${b.name}`, html), text).catch(() => {});
  return NextResponse.redirect(`${base}/bedrijf/${slug}/?offerte=sent#offerte`, 303);
}
