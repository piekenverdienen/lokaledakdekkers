// Zoekt per bedrijf zonder website de eigen site via Serper (Google) en controleert of de bedrijfsnaam op die site staat.
// Draait op de achtergrond bij het opstarten als SERPER_API_KEY gezet is. Gidsen, platforms en sociale media worden overgeslagen.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");
const KEY = process.env.SERPER_API_KEY;
if (!KEY) { console.log("website-zoeker: geen SERPER_API_KEY, overgeslagen"); process.exit(0); }
const LIMIT = Number(process.env.FIND_WEBSITES_LIMIT ?? 20000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SKIP = /(werkspot|homedeal|solvari|offerte|trustoo|slimster|zoofy|kvk\.nl|openkvk|overheid\.io|facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|google|maps\.|telefoonboek|detelefoongids|bedrijvenpagina|drimble|cylex|opendi|hotfrog|yelp|trustpilot|klantenvertellen|marktplaats|bouwbedrijf-vinden|dakdekker-vinden|dakdekkers\.nl|dakdekkerslijst|lokaledakdekkers|wikipedia|rtlnieuws|nu\.nl|ad\.nl|indeed|werk\.nl|nationalevacaturebank|jobbird|company\.info|bedrijfsinfo|allecijfers|graydon|creditsafe|kompass|europages|112|politie|gemeente)/i;
const norm = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(b\.?v\.?|v\.?o\.?f\.?|c\.?v\.?|h\.?o\.?d\.?n\.?|dakdekkersbedrijf|dakdekkers|dakdekker|dakwerken|dakbedekkingen|dakbedekking|dakservice|daktechniek|dakspecialist|installatiebedrijf|bouwbedrijf|en|de|het|van|der|den)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

async function search(q) {
  const r = await fetch("https://google.serper.dev/search", { method: "POST", headers: { "X-API-KEY": KEY, "Content-Type": "application/json" }, body: JSON.stringify({ q, gl: "nl", hl: "nl", num: 6 }) });
  if (r.status === 429) { await sleep(3000); return search(q); }
  if (!r.ok) throw new Error(`serper ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return r.json();
}
async function pageText(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LokaalBot/0.1; +https://lokaledakdekkers.nl)" }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok) return null;
    const html = await r.text();
    return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").toLowerCase();
  } catch { return null; } finally { clearTimeout(t); }
}

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query("update businesses set website_checked_at=null where website is null and website_checked_at between '2026-10-05 18:03+00' and '2026-10-05 18:13+00'");
const BLOCK = new Set((await c.query("select domain from directory_domains").catch(() => ({ rows: [] }))).rows.map((r) => r.domain));
const blocked = (host) => [...BLOCK].some((d) => host === d || host.endsWith('.' + d));
const rows = (await c.query("select id, name, city, kvk_number from businesses where source='kvk' and website is null and website_checked_at is null and status<>'hidden' order by (city is null), name limit $1", [LIMIT])).rows;
console.log(`website-zoeker: ${rows.length} bedrijven te zoeken`);
let found = 0, done = 0, calls = 0;
for (const b of rows) {
  let website = null, source = null;
  try {
    const cleanName = b.name.replace(/["'`]/g, "").replace(/\s+/g, " ").trim();
    const q = `"${cleanName}"${b.city ? ` ${b.city}` : ""} dakdekker`;
    const data = await search(q); calls++;
    const nameWords = norm(b.name).split(" ").filter((w) => w.length > 2);
    for (const hit of (data.organic ?? []).slice(0, 5)) {
      let host; try { host = new URL(hit.link).hostname.replace(/^www\./, ""); } catch { continue; }
      if (SKIP.test(host) || SKIP.test(hit.link) || blocked(host)) continue;
      const hostHit = nameWords.some((w) => w.length >= 4 && host.replace(/[^a-z0-9]/g, "").includes(w));
      const snippet = `${hit.title ?? ""} ${hit.snippet ?? ""}`.toLowerCase();
      const snippetHits = nameWords.filter((w) => snippet.includes(w)).length;
      if (!hostHit && snippetHits < Math.min(2, nameWords.length)) continue;
      const text = await pageText(`https://${host}`);
      if (!text) continue;
      const textHits = nameWords.filter((w) => text.includes(w)).length;
      const kvkHit = b.kvk_number && text.replace(/\s/g, "").includes(b.kvk_number.replace(/^0+/, ""));
      if (kvkHit || textHits >= Math.min(2, nameWords.length) || (hostHit && textHits >= 1)) { website = `https://${host}`; source = kvkHit ? "serper_kvk" : "serper_naam"; break; }
    }
  } catch (e) {
    console.error(`website-zoeker: ${b.name}: ${e.message}`);
    if (/serper (401|402|403)/.test(e.message) || /Not enough credits/i.test(e.message)) { console.log("website-zoeker: gestopt (sleutel of credits), probeert later opnieuw"); break; }
    // andere fouten (400 op een rare naam, time-out): dit bedrijf overslaan en doorgaan
  }
  await c.query("update businesses set website=$2, website_source=$3, website_checked_at=now() where id=$1", [b.id, website, source]);
  if (website) found++;
  done++;
  if (done % 250 === 0) console.log(`website-zoeker: ${done}/${rows.length}, ${found} gevonden, ${calls} zoekopdrachten`);
  await sleep(100);
}
const st = (await c.query("select count(*)::int as n, count(website)::int as met_website from businesses where source='kvk' and status<>'hidden'")).rows[0];
console.log(`website-zoeker klaar: ${done} gezocht, ${found} gevonden; totaal ${st.met_website} van ${st.n} bedrijven heeft nu een website`);
await c.end();
