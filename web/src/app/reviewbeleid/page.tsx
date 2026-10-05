import type { Metadata } from "next";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Reviewbeleid", alternates: { canonical: "/reviewbeleid/" } };
export default async function Reviewbeleid() {
  const v = await currentVertical();
  return (
    <main className="wrap prose" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 760 }}>
      <h1>Reviewbeleid</h1>
      <p>Reviews op {v.brand} komen van klanten, niet van ons en niet van het bedrijf zelf. Zo houden we ze betrouwbaar.</p>
      <h2>Wie mag een review schrijven</h2>
      <p>Iedereen die werk heeft laten doen door het bedrijf. Je bevestigt je review via een link in je mail. Per e-mailadres kan één review per bedrijf per 30 dagen.</p>
      <h2>Geverifieerde klus</h2>
      <p>Geef je een factuurnummer op, dan krijgt je review na controle het label Geverifieerde klus. Deze reviews wegen zwaarder in de score. De factuur zelf tonen we nooit en bewaren we hooguit 90 dagen.</p>
      <h2>Wat we niet plaatsen</h2>
      <p>Scheldwoorden, persoonsgegevens van anderen, reviews van concurrenten of van het bedrijf zelf, en reviews die niet over een echte klus gaan. Elke review wordt binnen een werkdag bekeken voordat hij online komt.</p>
      <h2>Reageren en melden</h2>
      <p>Een bedrijf kan onder een review reageren en kan een review melden als die onjuist is. We beoordelen meldingen zelf; een review verwijderen we alleen als hij tegen dit beleid ingaat, niet omdat hij negatief is.</p>
      <p>Vragen: info@{v.domain}.</p>
    </main>
  );
}
