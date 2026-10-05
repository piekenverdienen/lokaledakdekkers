// Tweede ronde: per bedrijf de detailweergave ophalen voor website, startdatum en handelsnamen.
// Draait na import-kvk.mjs; slaat bedrijven over die al gecontroleerd zijn (kvk_checked_at).
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");
const KEY = process.env.OVERHEID_IO_KEY;
if (!KEY) process.exit(0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path) {
  for (let a = 1; a <= 4; a++) {
    const r = await fetch(`https://api.overheid.io${path}`, { headers: { "ovio-api-key": KEY, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * a); continue; }
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`${r.status} ${path}`);
    return r.json();
  }
  return null;
}
const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
// 1. slugs ophalen via de lijst (goedkoop), alleen als die nog ontbreken
const missing = (await c.query("select count(*)::int as n from businesses where source='kvk' and kvk_slug is null")).rows[0].n;
if (missing > 0) {
  const v = (await c.query("select id, sbi_codes from verticals where slug=$1", [process.env.KVK_VERTICAL ?? "dakdekker"])).rows[0];
  let found = 0;
  for (const sbi of v.sbi_codes) for (let d = 10; d <= 99; d++) {
    let page = 1, pages = 1;
    while (page <= pages) {
      const p = new URLSearchParams({ size: "100", page: String(page), "filters[sbi]": sbi, query: `${d}*` });
      p.append("queryfields[]", "bezoeklocatie.postcode"); for (const f of ["kvknummer", "vestigingsnummer", "subdossiernummer"]) p.append("fields[]", f);
      const data = await api(`/v3/openkvk?${p}`); if (!data) break;
      pages = data.pageCount ?? 1;
      for (const b of data._embedded?.bedrijf ?? []) {
        const href = b._links?.self?.href; if (!href) continue;
        const slug = href.split("/").pop();
        const kvk = String(b.kvknummer ?? "").padStart(8, "0");
        const branch = b.vestigingsnummer ? String(b.vestigingsnummer).padStart(12, "0") : null;
        const r = await c.query("update businesses set kvk_slug=$1 where source='kvk' and kvk_slug is null and kvk_number=$2 and (kvk_branch=$3 or ($3 is null and kvk_branch is null))", [slug, kvk, branch]);
        found += r.rowCount;
      }
      page++; await sleep(120);
    }
  }
  console.log(`kvk-enrich: ${found} slugs gekoppeld`);
}
// 2. details ophalen
const rows = (await c.query("select id, kvk_slug from businesses where source='kvk' and kvk_slug is not null and kvk_checked_at is null order by id")).rows;
console.log(`kvk-enrich: ${rows.length} bedrijven te verrijken`);
let sites = 0, done = 0;
for (const row of rows) {
  const d = await api(`/v3/openkvk/${row.kvk_slug}`);
  if (d) {
    const website = d.website ? (String(d.website).startsWith("http") ? d.website : `https://${d.website}`) : null;
    const started = d.datumInschrijving ?? d.inschrijvingsdatum ?? d.datumAanvang ?? null;
    const names = Array.isArray(d.huidigeHandelsNamen) ? d.huidigeHandelsNamen : [];
    await c.query("update businesses set website=coalesce(website,$2), kvk_started=coalesce(kvk_started, $3::date), usps=usps, kvk_checked_at=now() where id=$1", [row.id, website, /^\d{4}-\d{2}-\d{2}/.test(started ?? "") ? started.slice(0, 10) : null]);
    if (website) sites++;
    if (done === 0) console.log("kvk-enrich: velden in detail: " + Object.keys(d).join(", "));
  } else {
    await c.query("update businesses set kvk_checked_at=now() where id=$1", [row.id]);
  }
  done++;
  if (done % 500 === 0) console.log(`kvk-enrich: ${done}/${rows.length}, ${sites} met website`);
  await sleep(120);
}
console.log(`kvk-enrich klaar: ${done} gecontroleerd, ${sites} websites gevonden`);
await c.end();
