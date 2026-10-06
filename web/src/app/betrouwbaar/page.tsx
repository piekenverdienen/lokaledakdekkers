import type { Metadata } from "next";
import ArticleView from "@/components/ArticleView";
import { getArticle } from "@/lib/kennis";
import { baseUrl, currentVertical } from "@/lib/site";
export const revalidate = 86400;
export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical(); const a = getArticle("betrouwbare-dakdekker-kiezen")!;
  return { title: a.title, description: a.description, alternates: { canonical: `/betrouwbare-${v.name_singular}/` } };
}
export default async function Betrouwbaar() {
  const v = await currentVertical(); const a = getArticle("betrouwbare-dakdekker-kiezen")!;
  const related = a.related.map((s) => getArticle(s)).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];
  const controls = (
    <section className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <h2 style={{ fontSize: 22 }}>Zo controleren we bedrijfsgegevens</h2>
      <p style={{ color: "var(--ink-2)" }}>Elke controle gaat over bedrijfsgegevens, niet over de kwaliteit van het dakwerk. Bij een profiel zie je welke controles zijn gedaan en wanneer.</p>
      <dl style={{ display: "grid", gap: 14, margin: 0 }}>
        <div id="kvk" style={{ scrollMarginTop: 80 }}><dt style={{ fontWeight: 700 }}>KvK-inschrijving gecontroleerd</dt><dd style={{ margin: "4px 0 0", color: "var(--ink-2)" }}><b>Wat:</b> het bedrijf staat actief ingeschreven in het Handelsregister onder het getoonde KvK-nummer. <b>Hoe:</b> we vergelijken de vermelding met het Handelsregister via een officiële dataleverancier. <b>Wanneer:</b> bij opname in de gids en daarna periodiek; de datum staat bij het label. <b>Wat het niet bewijst:</b> vakmanschap, verzekering of solvabiliteit.</dd></div>
        <div id="bevestigd" style={{ scrollMarginTop: 80 }}><dt style={{ fontWeight: 700 }}>Profiel bevestigd door het bedrijf</dt><dd style={{ margin: "4px 0 0", color: "var(--ink-2)" }}><b>Wat:</b> iemand van het bedrijf beheert dit profiel. <b>Hoe:</b> de bedrijfsnaam of het KvK-nummer staat op de opgegeven website, en de bevestiging liep via een e-mailadres dat bij die website hoort. <b>Wanneer:</b> eenmalig bij het claimen; de datum staat bij het label. <b>Wat het niet bewijst:</b> dat elk veld op het profiel door ons is nagekeken.</dd></div>
        <div id="reviews" style={{ scrollMarginTop: 80 }}><dt style={{ fontWeight: 700 }}>Reviews met opdrachtbewijs</dt><dd style={{ margin: "4px 0 0", color: "var(--ink-2)" }}><b>Wat:</b> de review hoort bij een echte opdracht. <b>Hoe:</b> de schrijver bevestigt per e-mail en geeft een factuurnummer op; wij beoordelen elke review voor plaatsing. De factuur zelf is nooit zichtbaar. <b>Wanneer:</b> bij plaatsing. <b>Wat het niet bewijst:</b> dat elke uitspraak in de review objectief is vastgesteld.</dd></div>
      </dl>
    </section>
  );
  return <ArticleView a={a} v={v} base={baseUrl(v)} canonical={`/betrouwbare-${v.name_singular}/`} related={related} nearby={controls} />;
}
