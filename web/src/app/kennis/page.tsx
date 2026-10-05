import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleView";
import { getAllArticles } from "@/lib/kennis";
import { currentVertical, cap } from "@/lib/site";
export const metadata: Metadata = { title: "Kennisbank: kosten, dakbedekking en een dakdekker kiezen", description: "Eerlijke uitleg over dakbedekking, prijzen in 2026, isolatie, lekkage en hoe je een betrouwbare dakdekker kiest. Zonder verkooppraat, met richtprijzen.", alternates: { canonical: "/kennis/" } };

export default async function Kennis() {
  const v = await currentVertical();
  const all = getAllArticles();
  const cats = [...new Set(all.map((a) => a.category))];
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <nav className="crumbs" aria-label="Kruimelpad"><a href="/">Nederland</a><span>/</span><b>Kennis</b></nav>
      <h1>Alles over je dak, voordat je een {v.name_singular} belt</h1>
      <p className="lede" style={{ marginTop: 8 }}>Wat dakwerk kost in 2026, welke dakbedekking bij jouw dak past, hoe je een lekkage opspoort en hoe je een betrouwbaar bedrijf herkent. Geschreven om je te helpen kiezen, niet om je iets te verkopen.</p>
      {cats.map((c) => (
        <section key={c} style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 14 }}>{c}</h2>
          <div className="grid cols-3">{all.filter((a) => a.category === c).map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
        </section>
      ))}
    </main>
  );
}
