import { mailLayout } from "./auth";
import type { Vertical } from "./db";
// Claim-mail zoals door Paul goedgekeurd. De regel over de plaats verschijnt alleen als hij klopt.
export function claimMail(v: Vertical, b: { name: string; city: string | null; slug: string }, verifiedInCity: number, totals: number, base: string, token: string, reminder = false) {
  const first = b.name.replace(/\s+(b\.?v\.?|v\.?o\.?f\.?)$/i, "");
  const cityLine = b.city ? (verifiedInCity === 0 ? `In ${b.city} is nog geen enkele ${v.name_singular} geverifieerd. Wie het eerst claimt, staat bovenaan.` : `In ${b.city} ${verifiedInCity === 1 ? "is al 1 bedrijf" : `zijn al ${verifiedInCity} bedrijven`} geverifieerd.`) : "";
  const preview = `${base}/bedrijf/${b.slug}/?eigenaar=1&o=${token}`;
  const subject = reminder ? `Nog even: jouw profiel op ${v.brand} staat klaar, ${first}` : `Jouw profiel op ${v.brand} staat klaar, ${first}`;
  const html = `
<p>Hallo ${first},</p>
<p>Steeds meer mensen zoeken een ${v.name_singular} niet via Google, maar via ChatGPT. En ChatGPT haalt zijn antwoorden uit bedrijvengidsen. Sta je daar niet goed in, dan word je niet genoemd.</p>
<p>Daarom hebben we je profiel op ${v.domain} alvast opgebouwd uit je website: logo, foto's van je werk, diensten en werkgebied. Je bent één stap verwijderd van een compleet, geverifieerd profiel met link naar je site.</p>
<p style="margin:24px 0"><a href="${preview}" style="background:#0B5C8F;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block">Bekijk jouw profiel</a></p>
<p>${totals.toLocaleString("nl-NL")} ${v.name_plural} staan al op de kaart van Nederland. ${cityLine}</p>
<p>Claimen kost 79,95 per jaar inclusief btw en duurt twee minuten.</p>
<p>Met vriendelijke groet,<br>Paul, ${v.brand}</p>
<p style="color:#5A6975;font-size:13px;margin-top:28px">Klopt het niet of wil je dit niet? <a href="${base}/uitschrijven/${token}/" style="color:#5A6975">Geen mails meer over dit profiel</a>. Gegevens corrigeren of je vermelding weghalen kan altijd gratis via <a href="${base}/corrigeren/${b.slug}/" style="color:#5A6975">deze pagina</a>.</p>`;
  const text = `Hallo ${first},\n\nSteeds meer mensen zoeken een ${v.name_singular} via ChatGPT, en ChatGPT haalt zijn antwoorden uit bedrijvengidsen. We hebben je profiel op ${v.domain} alvast opgebouwd uit je website.\n\nBekijk jouw profiel: ${preview}\n\n${totals} ${v.name_plural} staan al op de kaart. ${cityLine}\nClaimen kost 79,95 per jaar inclusief btw en duurt twee minuten.\n\nPaul, ${v.brand}\n\nGeen mails meer: ${base}/uitschrijven/${token}/`;
  return { subject, html: mailLayout(v.brand, reminder ? "Je profiel staat nog steeds klaar" : "Je profiel staat klaar", html), text };
}
