"""
geo_load.py: laadt out/municipalities.json en out/places.json (uit osm_extract.py) in Postgres.
Draai eerst osm_extract.py per provincie (of op netherlands-latest.osm.pbf voor alles in één keer).

  export DATABASE_URL=postgres://...
  python3 geo_load.py out/ "Overijssel"
"""
import json, os, re, sys, unicodedata
import psycopg

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def main(out, province_name):
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    row = conn.execute("insert into provinces (name, slug) values (%s,%s) on conflict (slug) do update set name=excluded.name returning id",
                       (province_name, slugify(province_name))).fetchone()
    pid = row[0]
    munis = json.load(open(f"{out}/municipalities.json"))
    for m in munis:
        conn.execute("""insert into municipalities (province_id, osm_id, name, slug, cbs_code, geom)
                        values (%s,%s,%s,%s,%s, st_multi(st_geomfromtext(%s,4326)))
                        on conflict (osm_id) do update set geom=excluded.geom, cbs_code=excluded.cbs_code""",
                     (pid, m["osm_id"], m["name"], m["slug"], m.get("cbs_code"), m["geom"]))
    places = json.load(open(f"{out}/places.json"))
    n = 0
    for p in places:
        if not p.get("municipality_osm_id"):
            continue
        conn.execute("""insert into places (municipality_id, osm_id, name, slug, place_type, population, geom)
                        values ((select id from municipalities where osm_id=%s), %s,%s,%s,%s,%s, st_setsrid(st_makepoint(%s,%s),4326))
                        on conflict (osm_id) do update set population=excluded.population""",
                     (p["municipality_osm_id"], p["osm_id"], p["name"], p["slug"], p["type"], p.get("population"), p["lng"], p["lat"]))
        n += 1
    conn.execute("update provinces set geom = (select st_multi(st_union(geom)) from municipalities where province_id=%s) where id=%s", (pid, pid))
    conn.commit()
    print(f"{province_name}: {len(munis)} gemeenten, {n} plaatsen geladen")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
