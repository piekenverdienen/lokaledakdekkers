// Draait bij elke start: schema (idempotent) en, als de gemeenten-tabel leeg is, de geo-data uit data/geo/.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const c = new Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
await c.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));

const dir = new URL("../data/geo/", import.meta.url);
if (existsSync(dir)) {
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const prov = f.replace(".json", "");
    const name = prov.charAt(0).toUpperCase() + prov.slice(1).replace(/-/g, " ");
    const { rows } = await c.query("select count(*)::int as n from municipalities m join provinces p on p.id=m.province_id where p.slug=$1", [prov]);
    if (rows[0].n > 0) continue;
    const d = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    const pr = await c.query("insert into provinces (name, slug) values ($1,$2) on conflict (slug) do update set name=excluded.name returning id", [d.name ?? name, prov]);
    const pid = pr.rows[0].id;
    for (const m of d.municipalities) {
      await c.query("insert into municipalities (province_id, osm_id, name, slug, cbs_code, geom) values ($1,$2,$3,$4,$5, st_multi(st_geomfromtext($6,4326))) on conflict do nothing", [pid, m.osm_id, m.name, m.slug, m.cbs_code, m.geom]);
    }
    for (const p of d.places) {
      if (!p.municipality_osm_id) continue;
      await c.query("insert into places (municipality_id, osm_id, name, slug, place_type, population, geom) values ((select id from municipalities where osm_id=$1), $2,$3,$4,$5,$6, st_setsrid(st_makepoint($7,$8),4326)) on conflict do nothing", [p.municipality_osm_id, p.osm_id, p.name, p.slug, p.type, p.population, p.lng, p.lat]);
    }
    await c.query("update provinces set geom = (select st_multi(st_union(geom)) from municipalities where province_id=$1) where id=$1", [pid]);
    console.log(`geo geladen: ${d.name ?? name}, ${d.municipalities.length} gemeenten, ${d.places.length} plaatsen`);
  }
}
await c.query("refresh materialized view place_stats");
// lokale inhoud per plaats (content/plaatsen/*.json)
{
  const { readdirSync, readFileSync, existsSync } = await import("node:fs");
  const dir = "content/plaatsen";
  if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const d = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
    const r = await c.query("select p.id from places p join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id where pr.slug=$1 and m.slug=$2 and p.slug=$3", [d.provincie, d.gemeente, d.plaats]);
    if (!r.rows[0]) { console.log(`plaatsinhoud: ${f} niet gekoppeld`); continue; }
    for (const v of (await c.query("select id from verticals")).rows) await c.query("insert into page_content (vertical_id, place_id, intro, body, faq, generated_at, reviewed) values ($1,$2,$3,$4,$5,now(),true) on conflict (vertical_id, place_id) do update set intro=excluded.intro, body=excluded.body, faq=excluded.faq, generated_at=now(), reviewed=true", [v.id, r.rows[0].id, d.intro, d.body, JSON.stringify(d.faq ?? [])]);
    console.log(`plaatsinhoud: ${f} geladen`);
  }
}
await c.end();
console.log("migratie klaar");
