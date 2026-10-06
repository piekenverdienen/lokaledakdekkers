import { cookies } from "next/headers";
import { one, q, type Vertical } from "@/lib/db";
import { initials } from "@/components/BusinessCard";
import VerifiedBadge from "@/components/VerifiedBadge";
// Bedrijven met gecontroleerde gegevens bij een plaats: drie echte kaarten. Zonder plaats een korte uitnodiging, geen willekeurige bedrijven.
export default async function NearbyVerified({ v, place, title }: { v: Vertical; place?: string; title?: boolean }) {
  const c = await cookies(); const name = (place ?? c.get("ld_place")?.value ?? "").trim();
  const p = name ? await one<{ id: number; name: string; lat: number; lng: number }>("select id, name, st_y(geom) as lat, st_x(geom) as lng from places where lower(name)=lower($1) order by population desc nulls last limit 1", [name]) : null;
  const near = p ? await q<{ name: string; slug: string; city: string | null; logo_url: string | null; photo: string | null; services: string[]; avg_score: number | null; review_count: number; km: number; verified_at: string | null; kvk_checked_at: string | null; paid_until: string | null }>(`
    select b.name, b.slug, b.city, b.logo_url, (select url from business_photos ph where ph.business_id=b.id order by sort_order limit 1) as photo,
      coalesce((select array_agg(service_slug) from business_services s where s.business_id=b.id), '{}') as services,
      (select round(avg(score)::numeric,1) from reviews r where r.business_id=b.id and r.status='published') as avg_score,
      (select count(*)::int from reviews r where r.business_id=b.id and r.status='published') as review_count,
      round((st_distance(b.geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography)/1000)::numeric) as km,
      b.verified_at::text, b.kvk_checked_at::text, b.paid_until::text
    from businesses b where b.vertical_id=$1 and b.status in ('claimed','pro') and b.geom is not null and st_dwithin(b.geom::geography, st_setsrid(st_makepoint($3,$2),4326)::geography, 30000)
    order by (b.status='pro') desc, avg_score desc nulls last, km limit 3`, [v.id, p.lat, p.lng]) : [];
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {title !== false && <h2>{p ? `${cap(v.name_plural)} met gecontroleerde bedrijfsgegevens bij ${p.name}` : `Welke ${v.name_plural} werken bij jou in de buurt?`}</h2>}
      {near.length > 0 && (
        <div className="grid cols-3">
          {near.map((b) => (
            <article key={b.slug} className="biz" style={{ padding: 0, overflow: "hidden" }}>
              {b.photo ? <img src={b.photo} alt={`Werk van ${b.name}`} className="ex-photo" loading="lazy" /> : <div className="ex-photo" style={{ display: "grid", placeItems: "center", background: "var(--sage-soft)", color: "var(--ink-2)", fontFamily: "Manrope, sans-serif", fontWeight: 700, fontSize: 28 }}>{initials(b.name)}</div>}
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="biz-title" style={{ alignItems: "center" }}>
                  {b.logo_url && <span className="logo" style={{ width: 40, height: 40 }}><img src={b.logo_url} alt="" /></span>}
                  <h3 style={{ fontSize: 18 }}>{b.name}</h3>
                </div>
                <div className="meta"><span>{b.city ?? ""}{b.km ? `, ${b.km} km` : ""}</span>{b.review_count > 0 && <span>{String(b.avg_score).replace(".", ",")} uit {b.review_count} reviews</span>}</div>
                {b.services.length > 0 && <div className="chips">{b.services.slice(0, 3).map((s) => <span key={s} className="chip">{v.services.find((x) => x.slug === s)?.name ?? s}</span>)}</div>}
                <VerifiedBadge small verifiedAt={b.verified_at} kvkCheckedAt={b.kvk_checked_at} paidUntil={b.paid_until} />
                <a href={`/bedrijf/${b.slug}/`} className="btn btn-outline" style={{ alignSelf: "flex-start" }}>Bekijk het bedrijf</a>
              </div>
            </article>
          ))}
        </div>
      )}
      {p && near.length === 0 && <p style={{ color: "var(--ink-2)" }}>Nog geen {v.name_plural} met gecontroleerde gegevens binnen 30 km van {p.name}. <a href={`/zoeken/?q=${encodeURIComponent(p.name)}`}>Bekijk alle {v.name_plural} bij {p.name}</a>.</p>}
      {!p && <p style={{ color: "var(--ink-2)", maxWidth: 620 }}>Vul je plaats in en je ziet welke bedrijven in jouw omgeving werken en welke bedrijfsgegevens van hen zijn gecontroleerd.</p>}
      <form method="get" className="search" style={{ marginTop: 4 }}>
        <input name="plaats" defaultValue={p?.name ?? ""} placeholder="Jouw plaats, bijvoorbeeld Zwolle" aria-label="Jouw plaats" />
        <button className="btn btn-primary" type="submit">Toon</button>
      </form>
    </section>
  );
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
