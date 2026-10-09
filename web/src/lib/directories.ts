// Gidssites, platforms en sociale media die nooit de eigen website van een bedrijf zijn.
export const DIRECTORY_DOMAINS = [
  "oozo.nl", "telefoonboek.nl", "detelefoongids.nl", "goudengids.nl", "openingstijden.nl", "openingstijden.com", "drimble.nl", "bedrijfsinformatie.nl",
  "bedrijvenpagina.nl", "nlbedrijven.com", "cylex.nl", "cylex-nederland.nl", "yelp.nl", "yelp.com", "werkspot.nl", "trustoo.nl", "homedeal.nl",
  "facebook.com", "instagram.com", "linkedin.com", "youtube.com", "twitter.com", "x.com", "tiktok.com", "pinterest.com", "kvk.nl", "opencorporates.com",
  "companyinfo.nl", "bedrijvenregister.nl", "infobel.com", "hotfrog.nl", "startpagina.nl", "marktplaats.nl", "google.com", "google.nl", "bing.com",
  "openkvk.nl", "overheid.io", "allebedrijvenin.nl", "bedrijfstelefoonboek.nl", "wiekentwie.nl", "plaatsengids.nl", "vindjewerkplaats.nl", "klusup.nl",
  "offerteadviseur.nl", "solvari.nl", "vakmanzoeker.nl", "zoofy.nl", "thuisvakman.nl", "jouwweb.nl", "wix.com", "wixsite.com", "webnode.nl",
  "bedrijfsprofielen.nl", "nederlandsebedrijvengids.nl", "hetbedrijvenoverzicht.nl", "bedrijfnederland.nl", "kvk-nummer.nl", "ondernemersplein.nl",
  "lokaledakdekkers.nl",
];
export function hostOf(url: string | null | undefined) { if (!url) return null; try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } }
export function isDirectory(url: string | null | undefined) { const h = hostOf(url); return !!h && DIRECTORY_DOMAINS.some((d) => h === d || h.endsWith(`.${d}`)); }

const FREEMAIL = ["gmail.com", "hotmail.com", "hotmail.nl", "outlook.com", "outlook.nl", "live.nl", "live.com", "icloud.com", "me.com", "ziggo.nl", "kpnmail.nl", "kpnplanet.nl", "planet.nl", "home.nl", "hetnet.nl", "xs4all.nl", "zeelandnet.nl", "online.nl", "chello.nl", "casema.nl", "upcmail.nl", "telfort.nl", "tele2.nl", "yahoo.com", "msn.com"];
// Mag dit adres gemaild worden namens dit bedrijf? Alleen als het bij de eigen website hoort, of een privéadres is op een eigen (niet-gids)website.
export function emailFitsWebsite(email: string | null | undefined, website: string | null | undefined) {
  if (!email || !website) return false;
  const ed = email.split("@")[1]?.toLowerCase().trim(); const wh = hostOf(website);
  if (!ed || !wh || isDirectory(website) || isDirectory(`https://${ed}`)) return false;
  const base = (h: string) => h.split(".").slice(-2).join(".");
  return ed === wh || base(ed) === base(wh) || FREEMAIL.includes(ed);
}
