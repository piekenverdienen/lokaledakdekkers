import { mailLayout } from "./auth";
import type { Vertical } from "./db";
// Claim-mail zoals door Paul goedgekeurd. De regel over de plaats verschijnt alleen als hij klopt.
export function claimMail(v: Vertical, b: { name: string; city: string | null; slug: string }, verifiedInCity: number, totals: number, base: string, token: string, reminder = false) {
  const first = b.name.replace(/\s+(b\.?v\.?|v\.?o\.?f\.?)$/i, "");
  const cityLine = b.city ? (verifiedInCity === 0 ? `In ${b.city} is nog geen enkele ${v.name_singular} geverifieerd. Wie het eerst claimt, staat bovenaan.` : `In ${b.city} ${verifiedInCity === 1 ? "is al 1 bedrijf" : `zijn al ${verifiedInCity} bedrijven`} geverifieerd.`) : "";
  const preview = `${base}/bedrijf/${b.slug}/?eigenaar=1&o=${token}`;
  const subject = reminder ? `Nog even: is dit jouw bedrijf, ${first}?` : `We hebben je bedrijfspagina aangemaakt, ${first}. Is dit jouw bedrijf?`;
  const html = `
<p>Hallo ${first},</p>
<p>We hebben een bedrijfspagina voor ${first} aangemaakt op ${v.domain}, opgebouwd uit je eigen website: logo, diensten en werkgebied. Is dit jouw bedrijf?</p>
<p style="margin:24px 0"><a href="${preview}" style="background:#142E3A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">Bekijk je pagina</a></p>
<p>Steeds meer mensen zoeken een ${v.name_singular} via ChatGPT, en ChatGPT haalt zijn antwoorden uit gidsen zoals deze. Claim je pagina, maak hem persoonlijk met je foto's, en ontvang offerteaanvragen rechtstreeks: geen prijs per lead, maar één vast bedrag van 79,95 per jaar inclusief btw, of je nu vijf of vijftig aanvragen krijgt.</p>
<p>${totals.toLocaleString("nl-NL")} ${v.name_plural} staan al op de kaart. ${cityLine}</p>
<p>Met vriendelijke groet,<br>Paul, ${v.brand}</p>
<img src="${base}/o/${token}/" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
<p style="color:#5A6975;font-size:13px;margin-top:28px">Klopt het niet of wil je dit niet? <a href="${base}/uitschrijven/${token}/" style="color:#5A6975">Geen mails meer over dit profiel</a>. Gegevens corrigeren of je vermelding weghalen kan altijd gratis via <a href="${base}/corrigeren/${b.slug}/" style="color:#5A6975">deze pagina</a>.</p>`;
  const text = `Hallo ${first},\n\nWe hebben een bedrijfspagina voor je aangemaakt op ${v.domain}, opgebouwd uit je website. Is dit jouw bedrijf?\n\nBekijk je pagina: ${preview}\n\nClaim hem, maak hem persoonlijk en ontvang offerteaanvragen rechtstreeks voor 79,95 per jaar inclusief btw, hoeveel aanvragen je ook krijgt.\n${totals} ${v.name_plural} staan al op de kaart. ${cityLine}\n\nPaul, ${v.brand}\n\nGeen mails meer: ${base}/uitschrijven/${token}/`;
  return { subject, html: mailLayout(v.brand, reminder ? "Is dit jouw bedrijf?" : "We hebben je bedrijfspagina aangemaakt", html), text };
}

// Informatiemail voor eenmanszaken en vof's: geen prijs, geen verkoop, alleen informatie en rechten (AVG artikel 14).
export function infoMail(v: Vertical, b: { name: string; slug: string; kvk_number?: string | null }, base: string, token: string) {
  const page = `${base}/bedrijf/${b.slug}/?eigenaar=1&o=${token}`;
  const subject = `Uw bedrijfsgegevens op ${v.domain}`;
  const html = `
<p>Geachte heer, mevrouw,</p>
<p>Wij laten u weten dat de bedrijfsgegevens van <b>${b.name}</b> zijn opgenomen in ${v.brand} (${v.domain}), een openbare gids van ${v.name_plural} in Nederland. De gegevens komen uit het Handelsregister van de KvK${b.kvk_number ? ` (KvK ${b.kvk_number})` : ""} en, waar aanwezig, van de website van uw bedrijf.</p>
<p>Op de pagina hieronder ziet u welke gegevens wij tonen. U kunt ze daar laten corrigeren, aanvullen of laten verwijderen.</p>
<p style="margin:24px 0"><a href="${page}" style="background:#142E3A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">Bekijk uw gegevens</a></p>
<p>Uw rechten: u kunt bezwaar maken tegen de vermelding, inzage vragen, of verwijdering en correctie verzoeken via <a href="${base}/corrigeren/${b.slug}/">${base.replace(/^https?:\/\//, "")}/corrigeren</a> of door op deze mail te antwoorden. Meer informatie staat in onze <a href="${base}/privacy/">privacyverklaring</a>.</p>
<p>Met vriendelijke groet,<br>${v.brand}, een dienst van Rombots Digital B.V.</p>
<img src="${base}/o/${token}/" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
<p style="color:#5A6975;font-size:13px;margin-top:28px">Wij sturen u over deze vermelding geen verdere berichten tenzij u daarom vraagt. <a href="${base}/uitschrijven/${token}/" style="color:#5A6975">Geen berichten meer ontvangen</a>.</p>`;
  const text = `Geachte heer, mevrouw,\n\nDe bedrijfsgegevens van ${b.name} zijn opgenomen in ${v.brand} (${v.domain}), een openbare gids van ${v.name_plural}. De gegevens komen uit het Handelsregister van de KvK en, waar aanwezig, van uw website.\n\nBekijk, corrigeer of verwijder uw gegevens: ${page}\n\nU kunt bezwaar maken, inzage vragen of verwijdering verzoeken via ${base}/corrigeren/${b.slug}/ of door op deze mail te antwoorden. Privacyverklaring: ${base}/privacy/\n\n${v.brand}, een dienst van Rombots Digital B.V.\n\nGeen berichten meer: ${base}/uitschrijven/${token}/`;
  return { subject, html: mailLayout(v.brand, "Uw bedrijfsgegevens", html), text };
}
export function unsubHeaders(base: string, token: string, domain: string) {
  return { "List-Unsubscribe": `<${base}/api/unsubscribe/${token}/>, <mailto:info@${domain}?subject=uitschrijven%20${token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
