import type { Metadata } from "next";
import { currentVertical, cap } from "@/lib/site";
export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical();
  return { title: `Zo herken je een betrouwbare ${v.name_singular}`, description: `Checklist tegen oplichting door ${v.name_plural}: KvK controleren, nooit een voorschot aan de deur, schriftelijke offerte, garantie op papier.`, alternates: { canonical: `/betrouwbare-${v.name_singular}/` } };
}
export default async function Betrouwbaar() {
  const v = await currentVertical();
  const items = [
    ["Betaal nooit een voorschot aan de deur", `Een ${v.name_singular} die ongevraagd aanbelt, een probleem aan je dak "ziet" en direct wil beginnen tegen contante betaling is bijna altijd oplichting. Stuur hem weg en bel een bedrijf uit de gids.`],
    ["Controleer het KvK-nummer en de startdatum", `Elk profiel op ${v.brand} toont het KvK-nummer en sinds wanneer het bedrijf is ingeschreven. Een bedrijf dat vorige maand is gestart en nu al tien jaar garantie belooft, is een rode vlag.`],
    ["Vraag altijd een schriftelijke offerte", "Met werkomschrijving, materialen, m2, prijs inclusief btw, planning en garantievoorwaarden. Vergelijk er minimaal twee, liever drie."],
    ["Let op het label Geverifieerd", "Geverifieerde bedrijven hebben hun profiel bevestigd via het e-maildomein van hun website of een brief op het KvK-adres. Reviews met het label Geverifieerde klus zijn gekoppeld aan een factuur."],
    ["Garantie alleen op papier", "Mondelinge garantie bestaat niet. Vraag of het bedrijf is aangesloten bij een garantiefonds of branchevereniging en controleer dat bij die organisatie."],
  ];
  return (
    <main className="wrap" style={{ padding: "32px 24px 64px", maxWidth: 800 }}>
      <h1>Zo herken je een betrouwbare {v.name_singular}</h1>
      <p className="lede" style={{ marginTop: 12 }}>Dakwerk is duur en je ziet het resultaat niet van dichtbij. Daarom trekt deze branche oplichters aan. Vijf controles die je in tien minuten doet.</p>
      <ol style={{ display: "flex", flexDirection: "column", gap: 14, padding: 0, margin: "24px 0", listStyle: "none" }}>
        {items.map(([t, b], i) => (<li key={i} className="card"><h2 style={{ fontSize: 18, marginBottom: 6 }}>{i + 1}. {t}</h2><p style={{ color: "var(--ink-2)" }}>{b}</p></li>))}
      </ol>
      <p><a href="/">Zoek een geverifieerde {v.name_singular} bij jou in de buurt</a></p>
    </main>
  );
}
