import type { Metadata } from "next";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Privacyverklaring", alternates: { canonical: "/privacy/" } };
export default async function Privacy() {
  const v = await currentVertical();
  return (
    <main className="wrap prose" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 760 }}>
      <h1>Privacyverklaring</h1>
      <p>{v.brand} (onderdeel van YourFellow B.V.) is een bedrijvengids voor {v.name_plural} in Nederland. Hieronder staat welke gegevens we gebruiken en waarom.</p>
      <h2>Bedrijfsgegevens in de gids</h2>
      <p>De basisvermeldingen komen uit het openbare Handelsregister van de Kamer van Koophandel: handelsnaam, KvK-nummer, vestigingsnummer, vestigingsplaats, rechtsvorm en inschrijvingsdatum. Van eenmanszaken en vof's tonen we geen straatnaam en huisnummer, omdat dat vaak een woonadres is. Grondslag is ons gerechtvaardigd belang als bedrijvengids. Een bedrijf kan zijn vermelding laten corrigeren of verwijderen via de knop Gegevens corrigeren op het profiel; we verwerken dat binnen drie werkdagen.</p>
      <h2>Geclaimde profielen</h2>
      <p>Wie een profiel claimt geeft een e-mailadres op en laat ons de website van het bedrijf lezen om het profiel op te bouwen. We bewaren het e-mailadres voor het inloggen en voor berichten over het profiel. Betalingen lopen via Mollie; wij bewaren geen bankgegevens.</p>
      <h2>Reviews en offerteaanvragen</h2>
      <p>Bij een review bewaren we je naam, e-mailadres, de tekst en eventueel een factuurverwijzing. Je e-mailadres is niet zichtbaar. Een offerteaanvraag gaat naar het bedrijf dat je zelf kiest, of naar maximaal drie bedrijven als je daarvoor kiest, en wordt niet aan anderen verkocht. We bewaren aanvragen 12 maanden.</p>
      <h2>Cookies en statistieken</h2>
      <p>We gebruiken alleen functionele cookies, bijvoorbeeld om je ingelogd te houden. Kaarten komen van OpenStreetMap.</p>
      <h2>Je rechten</h2>
      <p>Je kunt je gegevens inzien, laten corrigeren of laten verwijderen. Mail naar info@{v.domain}. Je kunt ook een klacht indienen bij de Autoriteit Persoonsgegevens.</p>
      <h2>Verwerkers</h2>
      <p>Hosting op een server in Duitsland (Hetzner), e-mail via Resend (EU), betalingen via Mollie, bedrijfsdata via overheid.io, tekstverwerking van websites via Anthropic.</p>
      <p>Laatst bijgewerkt: 5 oktober 2026.</p>
    </main>
  );
}
