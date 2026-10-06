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
<p style="color:#5A6975;font-size:13px;margin-top:28px">Klopt het niet of wil je dit niet? <a href="${base}/uitschrijven/${token}/" style="color:#5A6975">Geen mails meer over dit profiel</a>. Gegevens corrigeren of je vermelding weghalen kan altijd gratis via <a href="${base}/corrigeren/${b.slug}/" style="color:#5A6975">deze pagina</a>.</p>`;
  const text = `Hallo ${first},\n\nWe hebben een bedrijfspagina voor je aangemaakt op ${v.domain}, opgebouwd uit je website. Is dit jouw bedrijf?\n\nBekijk je pagina: ${preview}\n\nClaim hem, maak hem persoonlijk en ontvang offerteaanvragen rechtstreeks voor 79,95 per jaar inclusief btw, hoeveel aanvragen je ook krijgt.\n${totals} ${v.name_plural} staan al op de kaart. ${cityLine}\n\nPaul, ${v.brand}\n\nGeen mails meer: ${base}/uitschrijven/${token}/`;
  return { subject, html: mailLayout(v.brand, reminder ? "Is dit jouw bedrijf?" : "We hebben je bedrijfspagina aangemaakt", html), text };
}
