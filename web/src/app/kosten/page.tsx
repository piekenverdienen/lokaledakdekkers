import type { Metadata } from "next";
import { ArticleCard } from "@/components/ArticleView";
import { getAllArticles } from "@/lib/kennis";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Wat kost dakwerk in 2026? Richtprijzen per klus", description: "Richtprijzen 2026 voor een nieuw dak, plat dak, dakpannen, dakkapel, isolatie en reparaties, plus de regionale cijfers uit facturen zodra die er zijn.", alternates: { canonical: "/kosten/" } };
export default async function Kosten() {
  const v = await currentVertical();
  const prijs = getAllArticles().filter((a) => a.category === "Kosten" || a.category === "Isolatie");
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <nav className="crumbs" aria-label="Kruimelpad"><a href="/">Nederland</a><span>/</span><b>Kosten</b></nav>
      <h1>Wat kost dakwerk in 2026?</h1>
      <p className="lede" style={{ marginTop: 8 }}>Richtprijzen per klus, samengesteld uit Nederlandse prijsgidsen van 2026. Zodra {v.brand} per provincie minimaal vijf facturen van geverifieerde klussen heeft, staan hier echte regionale cijfers, met de steekproef erbij.</p>
      <div className="grid cols-3" style={{ marginTop: 24 }}>{prijs.map((a) => <ArticleCard key={a.slug} a={a} />)}</div>
      <div className="building" style={{ marginTop: 24 }}>Regionale richtprijzen uit facturen: nog geen vijf geverifieerde klussen per provincie. Liever geen cijfer dan een verzonnen cijfer.</div>
    </main>
  );
}
