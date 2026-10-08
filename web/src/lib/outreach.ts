import { mailLayout } from "./auth";
import type { Vertical } from "./db";
// Claimmail als persoonlijke, platte mail (geen nieuwsbriefopmaak): beter in de inbox en vaker gelezen.
export const CLAIM_FROM = "Paul van Lokale Dakdekkers <paul@send.lokaledakdekkers.nl>";
export function claimMail(v: Vertical, b: { name: string; city: string | null; slug: string; services?: string[] }, verifiedInCity: number, totals: number, base: string, token: string, reminder = false, variant: "A" | "B" = "A") {
  const first = b.name.replace(/[\s,]+(b\.?\s?v\.?|n\.?\s?v\.?|v\.?o\.?f\.?)$/i, "").trim();
  const preview = `${base}/bedrijf/${b.slug}/?eigenaar=1&o=${token}`;
  const shown = `${v.domain}/bedrijf/${b.slug}`;
  const names = (b.services ?? []).map((s) => v.services.find((x) => x.slug === s)?.name?.replace(/\s*\(.*?\)/g, "").toLowerCase()).filter(Boolean).slice(0, 3) as string[];
  const svc = names.length ? `jullie diensten (${names.length > 1 ? names.slice(0, -1).join(", ") + " en " + names[names.length - 1] : names[0]})` : "jullie diensten";
  const area = b.city ? ` en jullie werkgebied rond ${b.city}` : " en jullie werkgebied";
  const first1 = b.city ? (verifiedInCity === 0 ? `In ${b.city} heeft nog geen ${v.name_singular} zijn pagina geclaimd. Wie dat als eerste doet, staat bovenaan.` : `In ${b.city} ${verifiedInCity === 1 ? "heeft 1 bedrijf" : `hebben ${verifiedInCity} bedrijven`} hun pagina al geclaimd; geclaimde pagina's staan bovenaan.`) : "Wie als eerste in zijn plaats claimt, staat bovenaan.";
  const subject = reminder ? `Nog even: ${first} op ${v.domain}` : variant === "B" ? "Is dit jullie bedrijfspagina?" : `${first} op ${v.domain}`;
  const P = (t: string) => `<p style="margin:0 0 14px">${t}</p>`;
  const link = `<a href="${preview}" style="color:#176E96">${shown}</a>`;
  const unsub = `<p style="margin:24px 0 0;color:#6B7780;font-size:12px">Geen mail meer over deze pagina? <a href="${base}/uitschrijven/${token}/" style="color:#6B7780">Afmelden</a>. Je ontvangt dit bericht omdat ${b.name} in het Handelsregister staat als ${v.name_singular}. Lokale Dakdekkers is een dienst van Rovimed Group B.V.</p>`;
  const pixel = `<img src="${base}/o/${token}/" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`;
  const wrap = (inner: string) => `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1d2a33;max-width:560px">${inner}${pixel}${unsub}</div>`;
  if (reminder) {
    const html = wrap(P(`Hoi team van ${first},`) + P(`Vorige week stuurde ik een link naar jullie pagina op ${v.domain}. Die staat nog klaar: ${link}`) + P(first1) + P("Groet,<br>Paul<br>Lokale Dakdekkers"));
    const text = `Hoi team van ${first},\n\nVorige week stuurde ik een link naar jullie pagina op ${v.domain}. Die staat nog klaar: ${preview}\n\n${first1}\n\nGroet,\nPaul\nLokale Dakdekkers\n\nGeen mail meer: ${base}/uitschrijven/${token}/`;
    return { subject, html, text };
  }
  const html = wrap(
    P(`Hoi team van ${first},`) +
    P(`Ik heb een pagina voor jullie gemaakt op ${v.domain}, opgebouwd uit jullie website: jullie logo, ${svc}${area}.`) +
    P(`Bekijk hem hier: ${link}`) +
    P("Waarom claimen de moeite waard is:") +
    `<ul style="margin:0 0 14px;padding-left:20px"><li style="margin-bottom:6px"><b>Vindbaar in Google en ChatGPT.</b> Steeds meer mensen vragen ChatGPT om een ${v.name_singular}. Een complete, gecontroleerde pagina in een gids als deze vergroot de kans dat jullie genoemd worden.</li><li style="margin-bottom:6px"><b>Offerteaanvragen rechtstreeks bij jullie.</b> Geen prijs per lead en geen aanvragen die ook naar vijf concurrenten gaan.</li><li><b>Profiteer als eerste.</b> ${first1}</li></ul>` +
    P(`Claimen kost 79,95 euro per jaar, hoeveel aanvragen het ook worden. Eerst bekijk en controleer je alles, daarna pas betaal je.`) +
    P("Groet,<br>Paul<br>Lokale Dakdekkers"));
  const text = `Hoi team van ${first},\n\nIk heb een pagina voor jullie gemaakt op ${v.domain}, opgebouwd uit jullie website: jullie logo, ${svc}${area}.\n\nBekijk hem hier: ${preview}\n\nWaarom claimen de moeite waard is:\n- Vindbaar in Google en ChatGPT. Steeds meer mensen vragen ChatGPT om een ${v.name_singular}; een complete pagina in een gids als deze vergroot de kans dat jullie genoemd worden.\n- Offerteaanvragen rechtstreeks bij jullie, zonder prijs per lead.\n- Profiteer als eerste. ${first1}\n\nClaimen kost 79,95 euro per jaar, hoeveel aanvragen het ook worden. Eerst bekijk en controleer je alles, daarna pas betaal je.\n\nGroet,\nPaul\nLokale Dakdekkers\n\nGeen mail meer over deze pagina: ${base}/uitschrijven/${token}/`;
  return { subject, html, text };
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
<p>Met vriendelijke groet,<br>${v.brand}</p>
<img src="${base}/o/${token}/" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
<p style="color:#5A6975;font-size:13px;margin-top:28px">Wij sturen u over deze vermelding geen verdere berichten tenzij u daarom vraagt. <a href="${base}/uitschrijven/${token}/" style="color:#5A6975">Geen berichten meer ontvangen</a>.</p>`;
  const text = `Geachte heer, mevrouw,\n\nDe bedrijfsgegevens van ${b.name} zijn opgenomen in ${v.brand} (${v.domain}), een openbare gids van ${v.name_plural}. De gegevens komen uit het Handelsregister van de KvK en, waar aanwezig, van uw website.\n\nBekijk, corrigeer of verwijder uw gegevens: ${page}\n\nU kunt bezwaar maken, inzage vragen of verwijdering verzoeken via ${base}/corrigeren/${b.slug}/ of door op deze mail te antwoorden. Privacyverklaring: ${base}/privacy/\n\n${v.brand}, een dienst van Rovimed Group B.V.\n\nGeen berichten meer: ${base}/uitschrijven/${token}/`;
  return { subject, html: mailLayout(v.brand, "Uw bedrijfsgegevens", html, undefined, `U ontvangt dit bericht omdat ${b.name} in het Handelsregister staat als ${v.name_singular}.`), text };
}
export function unsubHeaders(base: string, token: string, domain: string) {
  return { "List-Unsubscribe": `<${base}/api/unsubscribe/${token}/>, <mailto:info@${domain}?subject=uitschrijven%20${token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}
