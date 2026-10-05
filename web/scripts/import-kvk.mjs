// Haalt alle vestigingen met de SBI-codes van de vertical op via overheid.io (OpenKvK v3) en zet ze in businesses.
// Draait bij het opstarten van de container als OVERHEID_IO_KEY gezet is. Slaat over als er al KvK-data staat,
// tenzij FORCE_KVK_IMPORT=1. Per postcodegebied (2 cijfers) zodat elke query onder de pagineringslimiet blijft.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const KEY = process.env.OVERHEID_IO_KEY;
if (!KEY) { console.log("kvk-import: geen OVERHEID_IO_KEY, overgeslagen"); process.exit(0); }
const VERTICAL = process.env.KVK_VERTICAL ?? "dakdekker";
const FIELDS = ["naam", "kvknummer", "vestigingsnummer", "subdossiernummer", "rechtsvormCode", "rechtsvormOmschrijving", "actief", "vestiging",
  "inschrijvingstype", "website", "sbi", "activiteiten", "locatie", "bezoeklocatie.straat", "bezoeklocatie.huisnummer", "bezoeklocatie.postcode", "bezoeklocatie.plaats", "updated_at"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function api(path) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`https://api.overheid.io${path}`, { headers: { "ovio-api-key": KEY, Accept: "application/json" } });
    if (r.status === 429 || r.status >= 500) { await sleep(2000 * attempt); continue; }
    if (!r.ok) throw new Error(`overheid.io ${r.status} op ${path}: ${(await r.text()).slice(0, 200)}`);
    return r.json();
  }
  throw new Error(`overheid.io blijft falen op ${path}`);
}

function listUrl(sbi, prefix, page) {
  const p = new URLSearchParams();
  p.set("size", "100"); p.set("page", String(page));
  p.set("filters[sbi]", sbi);
  p.set("query", `${prefix}*`); p.append("queryfields[]", "bezoeklocatie.postcode");
  for (const f of FIELDS) p.append("fields[]", f);
  return `/v3/openkvk?${p.toString()}`;
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const v = (await c.query("select id, sbi_codes from verticals where slug=$1", [VERTICAL])).rows[0];
  if (!v) throw new Error(`vertical ${VERTICAL} niet gevonden`);
  const existing = (await c.query("select count(*)::int as n from businesses where vertical_id=$1 and source='kvk'", [v.id])).rows[0].n;
  if (existing > 100 && process.env.FORCE_KVK_IMPORT !== "1") { console.log(`kvk-import: al ${existing} KvK-bedrijven aanwezig, overgeslagen (FORCE_KVK_IMPORT=1 om te herhalen)`); await c.end(); return; }

  let calls = 0, seen = new Set(), inserted = 0, skipped = 0, inactive = 0;
  const t0 = Date.now();
  for (const sbi of v.sbi_codes) {
    for (let d = 10; d <= 99; d++) {
      const prefix = String(d);
      let page = 1, pageCount = 1;
      while (page <= pageCount) {
        let data;
        try { data = await api(listUrl(sbi, prefix, page)); calls++; }
        catch (e) { console.error(`kvk-import: ${e.message}`); break; }
        pageCount = data.pageCount ?? 1;
        if (page === 1 && data.totalItemCount) console.log(`kvk-import: sbi ${sbi} postcode ${prefix}xx: ${data.totalItemCount} resultaten`);
        for (const b of data?._embedded?.bedrijf ?? []) {
          const kvk = String(b.kvknummer ?? "").padStart(8, "0");
          const branch = b.vestigingsnummer ? String(b.vestigingsnummer).padStart(12, "0") : null;
          const key = `${kvk}-${branch ?? b.subdossiernummer ?? ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          if (b.actief === false) { inactive++; continue; }
          if (b.vestiging === false && !branch) { skipped++; continue; } // rechtspersoon zonder vestiging
          const name = (b.naam ?? "").trim();
          const loc = b.bezoeklocatie ?? {};
          if (!name || !loc.postcode) { skipped++; continue; }
          const sole = (b.rechtsvormCode ?? "").toUpperCase() === "EMZ" || /eenmanszaak/i.test(b.rechtsvormOmschrijving ?? "");
          const lat = b.locatie?.lat ? Number(b.locatie.lat) : null, lng = b.locatie?.lon ? Number(b.locatie.lon) : null;
          const website = b.website ? (String(b.website).startsWith("http") ? b.website : `https://${b.website}`) : null;
          let slug = slugify(name);
          const dup = (await c.query("select 1 from businesses where vertical_id=$1 and slug=$2", [v.id, slug])).rowCount;
          if (dup) slug = `${slug}-${slugify(loc.plaats ?? "")}`;
          const dup2 = (await c.query("select 1 from businesses where vertical_id=$1 and slug=$2", [v.id, slug])).rowCount;
          if (dup2) slug = `${slug}-${kvk}`;
          const r = await c.query(`
            insert into businesses (vertical_id, name, slug, kvk_number, kvk_branch, legal_form, is_sole_trader, street, housenumber, postcode, city, website, geom, source, status)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, case when $13::float8 is null then null else st_setsrid(st_makepoint($14,$13),4326) end, 'kvk', 'unclaimed')
            on conflict (vertical_id, slug) do nothing`,
            [v.id, name, slug, kvk, branch, b.rechtsvormOmschrijving ?? null, sole,
             sole ? null : (loc.straat ?? null), sole ? null : (loc.huisnummer ?? null), String(loc.postcode).replace(/\s/g, "").toUpperCase(), loc.plaats ?? null, website, lat, lng]);
          inserted += r.rowCount;
        }
        page++;
        await sleep(150);
      }
    }
  }
  console.log(`kvk-import: ${calls} calls, ${inserted} bedrijven ingevoegd, ${skipped} overgeslagen, ${inactive} inactief, ${Math.round((Date.now() - t0) / 1000)}s`);
  await c.query("update businesses b set municipality_id=m.id from municipalities m where b.municipality_id is null and b.geom is not null and st_contains(m.geom, b.geom)");
  await c.query("update businesses b set place_id=(select p.id from places p order by p.geom <-> b.geom limit 1) where b.place_id is null and b.geom is not null");
  await c.query("refresh materialized view place_stats");
  const stats = (await c.query("select count(*)::int as n, count(geom)::int as met_geom, count(municipality_id)::int as met_gemeente, count(website)::int as met_website, count(*) filter (where is_sole_trader)::int as eenmanszaken from businesses where vertical_id=$1 and source='kvk'", [v.id])).rows[0];
  console.log(`kvk-import klaar: ${JSON.stringify(stats)}`);
  await c.end();
}
main().catch((e) => { console.error("kvk-import fout:", e); process.exit(1); });
