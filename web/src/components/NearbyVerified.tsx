import { cookies } from "next/headers";
import { one, q, type Vertical } from "@/lib/db";
// "Geverifieerde dakdekkers bij jou in de buurt" onder kennisartikelen. Plaats uit de laatst bezochte plaatspagina (cookie) of uit het formulier.
export default async function NearbyVerified({ v, place }: { v: Vertical; place?: string }) {
  const c = await cookies(); const name = (place ?? c.get("ld_place")?.value ?? "").trim();
  const p = name ? await one<{ id: number; name: string; lat: number; lng: number }>("select id, name, st_y(geom) as lat, st_x(geom) as lng from places where lower(name)=lower($1) order by population desc nulls last limit 1", [name]) : null;
  const near = p ? await q<{ name: string; slug: string; city: string | null; avg_score: number | null; review_count: number; km: number }>(`
    select b.name, b.slug, b.city,
      (select round(avg(score)::numeric,1) from reviews r where r.business_id=b.id and r.status='published') as avg_score,
      (select count(*)::int from reviews r where r.business_id=b.id and r.status='published') as review_count,
      round((st_distance(b.geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography)/1000)::numeric) as km
    from businesses b where b.vertical_id=$1 and b.status in ('claimed','pro') and b.geom is not null and st_dwithin(b.geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography, 30000)
    order by (b.status='pro') desc, avg_score desc nulls last, km limit 5`, [v.id, p.lat, p.lng]) : [];
  return (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--amber-bg)", borderColor: "var(--amber)" }}>
      <h2 style={{ fontSize: 20 }}>Geverifieerde {v.name_plural} {p ? `bij ${p.name}` : "bij jou in de buurt"}</h2>
      {near.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {near.map((b) => <li key={b.slug}><a href={`/bedrijf/${b.slug}/`} style={{ fontWeight: 600 }}>{b.name}</a><span style={{ color: "var(--ink-2)", fontSize: 14 }}>{b.city ? `, ${b.city}` : ""}{b.km ? ` (${b.km} km)` : ""}{b.avg_score ? `, ${String(b.avg_score).replace(".", ",")} uit ${b.review_count} reviews` : ""}</span></li>)}
        </ul>
      ) : p ? <p style={{ color: "var(--ink-2)", margin: 0 }}>Nog geen geverifieerde {v.name_plural} binnen 30 km van {p.name}. <a href={`/zoeken/?q=${encodeURIComponent(p.name)}`}>Bekijk alle {v.name_plural} bij {p.name}</a>.</p> : null}
      <form method="get" className="search" style={{ marginTop: 4 }}>
        <input name="plaats" defaultValue={p?.name ?? ""} placeholder="Jouw plaats, bijvoorbeeld Zwolle" />
        <button className="btn btn-primary" type="submit">Toon</button>
      </form>
    </section>
  );
}
