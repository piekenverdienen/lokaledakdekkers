"""
kvk_import.py: laadt een KvK-adressenbestand (CSV, besteld bij account@kvk.nl op SBI 4391 en 4399)
in de tabel businesses. Kolomnamen in KvK-bestanden verschillen per levering; pas COLUMNS aan.

Gebruik:
  export DATABASE_URL=postgres://...
  python3 kvk_import.py data/kvk_dakdekkers.csv dakdekker

Wat het doet:
  1. leest de CSV, normaliseert naam, adres, postcode, rechtsvorm, startdatum
  2. geocodeert op postcode plus huisnummer via Nominatim (1 request per seconde, met cache in data/geocode.json)
  3. koppelt gemeente en dichtstbijzijnde plaats via PostGIS
  4. dedupliceert op kvk_number en op (naam, postcode)
  5. slaat eenmanszaken op zonder straat en huisnummer (zie PRD, Juridisch); die velden gaan pas open na claim
"""
import csv, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
import psycopg

COLUMNS = {  # kolomnaam in het KvK-bestand -> veld
    "Handelsnaam": "name", "KvK-nummer": "kvk_number", "Vestigingsnummer": "kvk_branch",
    "Straatnaam": "street", "Huisnummer": "housenumber", "Postcode": "postcode", "Plaats": "city",
    "Rechtsvorm": "legal_form", "Datum vestiging": "kvk_started", "Telefoonnummer": "phone",
    "E-mailadres": "email", "Website": "website", "SBI-code hoofdactiviteit": "sbi",
}
SOLE = {"eenmanszaak", "eenmanszaak met meer dan één eigenaar"}
UA = "lokaledakdekkers-import/0.1 (paul@yourfellow.nl)"

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def geocode(postcode, housenumber, cache):
    key = f"{postcode} {housenumber}".strip()
    if key in cache:
        return cache[key]
    q = urllib.parse.urlencode({"postalcode": postcode, "street": housenumber, "country": "nl", "format": "json", "limit": 1})
    req = urllib.request.Request(f"https://nominatim.openstreetmap.org/search?{q}", headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            rows = json.load(r)
        cache[key] = (float(rows[0]["lat"]), float(rows[0]["lon"])) if rows else None
    except Exception:
        cache[key] = None
    time.sleep(1.1)
    return cache[key]

def main(path, vertical_slug):
    conn = psycopg.connect(os.environ["DATABASE_URL"])
    vid = conn.execute("select id from verticals where slug=%s", (vertical_slug,)).fetchone()[0]
    cache_path = "data/geocode.json"
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    seen, inserted, skipped = set(), 0, 0

    with open(path, newline="", encoding="utf-8-sig") as f:
        delimiter = ";" if ";" in f.readline() else ","
        f.seek(0)
        for row in csv.DictReader(f, delimiter=delimiter):
            rec = {v: (row.get(k) or "").strip() for k, v in COLUMNS.items()}
            if not rec["name"] or not rec["postcode"]:
                skipped += 1
                continue
            rec["postcode"] = rec["postcode"].replace(" ", "").upper()
            key = rec["kvk_number"] or (slugify(rec["name"]), rec["postcode"])
            if key in seen:
                skipped += 1
                continue
            seen.add(key)
            sole = rec["legal_form"].lower() in SOLE
            pt = geocode(rec["postcode"], rec["housenumber"], cache)
            if pt is None:
                pt = geocode(rec["postcode"], "", cache)
            slug = slugify(rec["name"])
            n = conn.execute("select count(*) from businesses where vertical_id=%s and slug like %s", (vid, slug + "%")).fetchone()[0]
            if n:
                slug = f"{slug}-{slugify(rec['city'])}" if rec["city"] else f"{slug}-{n+1}"
            started = rec["kvk_started"]
            started = re.sub(r"^(\d{2})-(\d{2})-(\d{4})$", r"\3-\2-\1", started) or None
            conn.execute("""
              insert into businesses (vertical_id, name, slug, kvk_number, kvk_branch, kvk_started, legal_form, is_sole_trader,
                street, housenumber, postcode, city, phone, email, website, geom, source)
              values (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                case when %s is null then null else st_setsrid(st_makepoint(%s,%s),4326) end, 'kvk')
              on conflict (vertical_id, slug) do nothing
            """, (vid, rec["name"], slug, rec["kvk_number"] or None, rec["kvk_branch"] or None, started,
                  rec["legal_form"] or None, sole,
                  None if sole else rec["street"] or None, None if sole else rec["housenumber"] or None,
                  rec["postcode"], rec["city"] or None, rec["phone"] or None, rec["email"] or None, rec["website"] or None,
                  pt, pt[1] if pt else 0, pt[0] if pt else 0))
            inserted += 1
            if inserted % 100 == 0:
                conn.commit()
                json.dump(cache, open(cache_path, "w"))
                print(f"{inserted} ingelezen")

    conn.commit()
    json.dump(cache, open(cache_path, "w"))
    # gemeente en dichtstbijzijnde plaats koppelen
    conn.execute("""
      update businesses b set municipality_id = m.id
      from municipalities m where b.vertical_id=%s and b.municipality_id is null and b.geom is not null
        and st_contains(m.geom, b.geom)""", (vid,))
    conn.execute("""
      update businesses b set place_id = (
        select p.id from places p order by p.geom <-> b.geom limit 1)
      where b.vertical_id=%s and b.place_id is null and b.geom is not null""", (vid,))
    conn.execute("refresh materialized view place_stats")
    conn.commit()
    print(f"klaar: {inserted} bedrijven ingevoegd, {skipped} overgeslagen")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
