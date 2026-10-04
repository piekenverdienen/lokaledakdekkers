"""
osm_extract.py: leest een Geofabrik .osm.pbf (per provincie of heel NL) en schrijft drie JSON-bestanden:

  out/municipalities.json  gemeenten (admin_level=8) met vereenvoudigde geometrie
  out/places.json          woonplaatsen (place=city|town|village) met coordinaat en gemeente
  out/businesses.json      dakdekkers (craft=roofer|roofing) met contactgegevens en gemeente

Gebruik:  python3 osm_extract.py data/overijssel.osm.pbf out/
Vertical-tags staan in VERTICALS; voeg een vertical toe door een regel toe te voegen.
"""
import json, os, re, sys, unicodedata
import osmium
from shapely import wkb
from shapely.geometry import Point
from shapely.strtree import STRtree

VERTICALS = {
    "dakdekker": {"key": "craft", "values": {"roofer", "roofing"}},
}
PLACE_TYPES = {"city", "town", "village"}

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s

def first(tags, *keys):
    for k in keys:
        v = tags.get(k)
        if v:
            return v.split(";")[0].strip()
    return None

def norm_phone(p):
    if not p:
        return None
    d = re.sub(r"[^\d+]", "", p)
    if d.startswith("+31"):
        d = "0" + d[3:]
    elif d.startswith("0031"):
        d = "0" + d[4:]
    return d if 9 <= len(d) <= 11 else None

def norm_site(u):
    if not u:
        return None
    u = u.strip()
    if not u.startswith("http"):
        u = "https://" + u
    return u.rstrip("/")

class Handler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.wkbfab = osmium.geom.WKBFactory()
        self.municipalities = []
        self.places = []
        self.businesses = []

    def area(self, a):
        t = a.tags
        if t.get("boundary") == "administrative" and t.get("admin_level") == "8" and t.get("name"):
            try:
                geom = wkb.loads(self.wkbfab.create_multipolygon(a), hex=True)
            except Exception:
                return
            self.municipalities.append({
                "osm_id": a.orig_id(), "name": t["name"], "slug": slugify(t["name"]),
                "cbs_code": t.get("ref:gemeentecode"), "geom": geom,
            })

    def node(self, n):
        t = n.tags
        if t.get("place") in PLACE_TYPES and t.get("name"):
            self.places.append({
                "osm_id": n.id, "name": t["name"], "slug": slugify(t["name"]), "type": t["place"],
                "population": int(t["population"]) if t.get("population", "").isdigit() else None,
                "lat": n.location.lat, "lng": n.location.lon,
            })
        self._business(t, n.location.lat, n.location.lon, "node", n.id)

    def way(self, w):
        t = w.tags
        if not any(t.get(v["key"]) in v["values"] for v in VERTICALS.values()):
            return
        try:
            pts = [(nd.lon, nd.lat) for nd in w.nodes if nd.location.valid()]
        except Exception:
            return
        if not pts:
            return
        lng = sum(p[0] for p in pts) / len(pts)
        lat = sum(p[1] for p in pts) / len(pts)
        self._business(t, lat, lng, "way", w.id)

    def _business(self, t, lat, lng, kind, oid):
        for vertical, spec in VERTICALS.items():
            if t.get(spec["key"]) in spec["values"] and t.get("name"):
                self.businesses.append({
                    "vertical": vertical, "osm_type": kind, "osm_id": oid,
                    "name": t["name"].strip(), "slug": slugify(t["name"]),
                    "phone": norm_phone(first(t, "phone", "contact:phone", "contact:mobile")),
                    "website": norm_site(first(t, "website", "contact:website", "url")),
                    "email": first(t, "email", "contact:email"),
                    "street": first(t, "addr:street"), "housenumber": first(t, "addr:housenumber"),
                    "postcode": first(t, "addr:postcode"), "city": first(t, "addr:city"),
                    "lat": lat, "lng": lng,
                })

def main(pbf, out):
    os.makedirs(out, exist_ok=True)
    h = Handler()
    h.apply_file(pbf, locations=True, idx="flex_mem")

    geoms = [m["geom"] for m in h.municipalities]
    tree = STRtree(geoms)
    def muni_for(lat, lng):
        p = Point(lng, lat)
        for i in tree.query(p):
            if geoms[i].contains(p):
                return h.municipalities[i]
        return None

    for p in h.places:
        m = muni_for(p["lat"], p["lng"])
        p["municipality_osm_id"] = m["osm_id"] if m else None
    for b in h.businesses:
        m = muni_for(b["lat"], b["lng"])
        b["municipality_osm_id"] = m["osm_id"] if m else None

    # dedupliceren: zelfde naam en zelfde telefoon of postcode
    seen, uniq = {}, []
    for b in h.businesses:
        key = (b["slug"], b["phone"] or b["postcode"] or b["osm_id"])
        if key in seen:
            continue
        seen[key] = True
        uniq.append(b)

    # dichtstbijzijnde plaats per bedrijf (voor place_id)
    place_pts = [Point(p["lng"], p["lat"]) for p in h.places]
    ptree = STRtree(place_pts)
    for b in uniq:
        if place_pts:
            i = ptree.nearest(Point(b["lng"], b["lat"]))
            b["place_osm_id"] = h.places[i]["osm_id"]

    for m in h.municipalities:
        m["geom"] = m["geom"].simplify(0.0005).wkt
    json.dump(h.municipalities, open(f"{out}/municipalities.json", "w"), ensure_ascii=False)
    json.dump(h.places, open(f"{out}/places.json", "w"), ensure_ascii=False)
    json.dump(uniq, open(f"{out}/businesses.json", "w"), ensure_ascii=False)
    print(f"gemeenten {len(h.municipalities)}, plaatsen {len(h.places)}, dakdekkers {len(uniq)} (ruw {len(h.businesses)})")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "out")
