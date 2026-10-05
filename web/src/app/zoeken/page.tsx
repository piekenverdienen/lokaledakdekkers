import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { currentVertical, cap } from "@/lib/site";
export const metadata: Metadata = { title: "Zoeken", robots: { index: false, follow: true } };

export default async function Zoeken({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await currentVertical();
  const { q: term } = await searchParams;
  const t = (term ?? "").trim();
  const hits = t.length >= 2 ? await q<{ name: string; slug: string; municipality_slug: string; province_slug: string; municipality_name: string; population: number | null; business_count: number }>(`
    select p.name, p.slug, m.slug as municipality_slug, pr.slug as province_slug, m.name as municipality_name, p.population, coalesce(ps.business_count,0)::int as business_count
    from places p join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    left join place_stats ps on ps.place_id=p.id and ps.vertical_id=$2
    where unaccent(p.name) ilike unaccent($1)||'%' or unaccent(m.name) ilike unaccent($1)||'%'
    order by (lower(p.name)=lower($1)) desc, p.population desc nulls last limit 12`, [t, v.id]).catch(() => []) : [];
  const biz = t.length >= 2 ? await q<{ name: string; slug: string; city: string | null; status: string }>(`
    select name, slug, city, status from businesses
    where vertical_id=$2 and status<>'hidden' and (unaccent(name) ilike '%'||unaccent($1)||'%' or kvk_number=$1)
    order by status in ('pro','claimed') desc, (unaccent(name) ilike unaccent($1)||'%') desc, name limit 10`, [t, v.id]).catch(() => []) : [];
  if (hits.length === 1 && biz.length === 0) redirect(`/${hits[0].province_slug}/${hits[0].municipality_slug}/${hits[0].slug}/`);
  const postcode = /^\d{4}/.test(t);
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 720 }}>
      <h1 style={{ fontSize: 28 }}>{t ? `Zoekresultaten voor "${t}"` : `Zoek een plaats of ${v.name_singular}`}</h1>
      <form className="search" method="get" style={{ marginTop: 16 }}>
        <input name="q" defaultValue={t} placeholder="Plaats, bedrijfsnaam of KvK-nummer" autoComplete="off" />
        <button type="submit" className="btn btn-primary">Zoek {v.name_singular}</button>
      </form>
      {biz.length > 0 && (
        <section style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Bedrijven</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {biz.map((b) => (
              <a key={b.slug} href={`/bedrijf/${b.slug}/`} className="card card-link" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <span><b>{b.name}</b><br /><small>{b.city ?? ""}</small></span>
                <small>{b.status === "unclaimed" ? "nog niet geclaimd" : "geverifieerd"}</small>
              </a>
            ))}
          </div>
        </section>
      )}
      {t && hits.length > 0 && biz.length > 0 && <h2 style={{ fontSize: 18, margin: "20px 0 8px" }}>Plaatsen</h2>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: biz.length ? 0 : 20 }}>
        {t && hits.length === 0 && biz.length === 0 && <div className="card">{postcode ? "Zoeken op postcode komt eraan. Typ voor nu je plaatsnaam." : `Geen plaats of bedrijf gevonden voor "${t}". Probeer de naam van je gemeente, of een deel van de bedrijfsnaam.`}</div>}
        {hits.map((h) => (
          <a key={h.slug + h.municipality_slug} href={`/${h.province_slug}/${h.municipality_slug}/${h.slug}/`} className="card card-link" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <span><b>{h.name}</b><br /><small>Gemeente {h.municipality_name}</small></span>
            <small>{h.business_count} {v.name_plural}</small>
          </a>
        ))}
      </div>
    </main>
  );
}
