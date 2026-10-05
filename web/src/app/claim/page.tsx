import type { Metadata } from "next";
import { q } from "@/lib/db";
import { currentVertical, cap } from "@/lib/site";
export const metadata: Metadata = { title: "Claim je profiel", robots: { index: false, follow: false } };

export default async function Claim({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await currentVertical();
  const { q: term } = await searchParams;
  const hits = term && term.trim().length >= 2 ? await q<{ name: string; slug: string; city: string | null; status: string; kvk_number: string | null }>(`
    select name, slug, city, status, kvk_number from businesses
    where vertical_id=$1 and status<>'hidden' and (name ilike '%'||$2||'%' or city ilike $2||'%' or kvk_number=$2)
    order by status='unclaimed' desc, name limit 25`, [v.id, term.trim()]) : [];
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 760 }}>
      <h1>Claim je bedrijf op {v.brand}</h1>
      <p className="lede" style={{ marginTop: 12 }}>Zoek je bedrijf op naam, plaats of KvK-nummer. Staat het erbij, dan claim je het met je website en e-mailadres; we bouwen je profiel automatisch op. Staat het er niet, mail dan naar info@{v.domain} met je KvK-nummer.</p>
      <form className="search" method="get" style={{ marginTop: 20 }}>
        <input name="q" defaultValue={term ?? ""} placeholder="Bedrijfsnaam, plaats of KvK-nummer" autoComplete="off" />
        <button type="submit" className="btn btn-primary">Zoek</button>
      </form>
      {term && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          {hits.length === 0 && <div className="card">Niets gevonden voor "{term}". Probeer alleen de bedrijfsnaam, of het KvK-nummer.</div>}
          {hits.map((h) => (
            <div key={h.slug} className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div><b>{h.name}</b><br /><small style={{ color: "var(--ink-3)" }}>{h.city ?? ""}{h.kvk_number ? `, KvK ${h.kvk_number}` : ""}{h.status !== "unclaimed" ? ", al geclaimd" : ""}</small></div>
              {h.status === "unclaimed" ? <a href={`/claim/${h.slug}/`} className="btn btn-primary">Dit is mijn bedrijf</a> : <a href={`/dashboard/`} className="btn btn-outline">Inloggen</a>}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
