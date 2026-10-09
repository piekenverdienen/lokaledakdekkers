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
