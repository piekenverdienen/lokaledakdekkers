import type { Metadata } from "next";
import { q } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Gegevens corrigeren", robots: { index: false, follow: false } };
export default async function CorrigerenZoek({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const v = await currentVertical(); const { q: term } = await searchParams;
  const hits = term && term.trim().length >= 2 ? await q<{ name: string; slug: string; city: string | null }>(`select name, slug, city from businesses where vertical_id=$1 and status<>'hidden' and (name ilike '%'||$2||'%' or kvk_number=$2) order by name limit 20`, [v.id, term.trim()]) : [];
  return (
    <main className="wrap" style={{ padding: "24px 0 64px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 30 }}>Gegevens corrigeren</h1>
      <p className="lede" style={{ marginTop: 8 }}>Zoek het bedrijf waarvan de gegevens niet kloppen. Corrigeren is gratis en kan zonder account.</p>
      <form className="search" method="get" style={{ marginTop: 16 }}><input name="q" defaultValue={term ?? ""} placeholder="Bedrijfsnaam of KvK-nummer" /><button className="btn btn-primary" type="submit">Zoek</button></form>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
        {term && hits.length === 0 && <div className="card">Niets gevonden. Probeer een deel van de naam.</div>}
        {hits.map((h) => <a key={h.slug} href={`/corrigeren/${h.slug}/`} className="card card-link" style={{ flexDirection: "row", justifyContent: "space-between" }}><span><b>{h.name}</b><br /><small>{h.city ?? ""}</small></span><small>Corrigeren</small></a>)}
      </div>
    </main>
  );
}
