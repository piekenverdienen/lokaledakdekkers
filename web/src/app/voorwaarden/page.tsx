import type { Metadata } from "next";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Algemene voorwaarden voor bedrijven", alternates: { canonical: "/voorwaarden/" } };
export default async function Voorwaarden() {
  const v = await currentVertical();
  return (
    <main className="wrap prose" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 760 }}>
      <h1>Algemene voorwaarden voor bedrijven</h1>
      <p>Deze voorwaarden gelden voor bedrijven die een profiel claimen of een betaald profiel afnemen op {v.brand}, een dienst van YourFellow B.V. Door een profiel te claimen ga je akkoord met deze voorwaarden. Versie 5 oktober 2026.</p>
      <h2>1. Wat {v.brand} is</h2>
      <p>{v.brand} is een online bedrijvengids voor {v.name_plural} in Nederland. We tonen bedrijfsvermeldingen op basis van het Handelsregister en bieden bedrijven de mogelijkheid hun profiel te claimen, aan te vullen en als Geverifieerd profiel te publiceren. We zijn geen partij bij overeenkomsten tussen bedrijven en hun klanten en bemiddelen niet.</p>
      <h2>2. Basisvermelding</h2>
      <p>De gratis basisvermelding bevat gegevens uit het Handelsregister. Een bedrijf kan correcties doorgeven of verwijdering vragen via de knop Gegevens corrigeren; we verwerken dat binnen drie werkdagen.</p>
      <h2>3. Claimen en verificatie</h2>
      <p>Een profiel claimen kan alleen door of namens het bedrijf zelf. Bij het claimen controleren we of de opgegeven website van het bedrijf is en of het e-mailadres daarbij hoort. Wie een profiel claimt dat niet van hem is, handelt onrechtmatig; we verwijderen zo'n claim en kunnen aangifte doen.</p>
      <p>Het label Geverifieerd betekent dat het bedrijf actief is ingeschreven bij de KvK en dat de eigenaar het profiel heeft bevestigd via website en e-mail. Het label is geen oordeel over de kwaliteit van het werk.</p>
      <h2>4. Geverifieerd profiel: prijs en looptijd</h2>
      <p>Een Geverifieerd profiel kost {(((v as unknown as { verified_price_year_cents?: number }).verified_price_year_cents ?? 7995) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} euro per jaar inclusief btw, vooruit te betalen via iDEAL. De looptijd is twaalf maanden vanaf de betaling. Dertig dagen voor het einde sturen we een mail; verlengen gebeurt alleen door opnieuw te betalen. Er is geen automatische incasso en geen stilzwijgende verlenging. Wordt er niet verlengd, dan keert het profiel terug naar de gratis basisvermelding; de ingevulde gegevens blijven bewaard zodat later alsnog gepubliceerd kan worden.</p>
      <p>Omdat de dienst direct na betaling wordt geleverd en op maat is, geldt geen bedenktijd. Staat het profiel door een fout van ons langer dan vijf werkdagen offline, dan verlengen we de looptijd met die periode.</p>
      <h2>5. Inhoud van het profiel</h2>
      <p>Het bedrijf is verantwoordelijk voor de juistheid van teksten, foto's en gegevens op zijn profiel, ook als die door ons uit de website zijn overgenomen en door het bedrijf zijn goedgekeurd. Het bedrijf garandeert dat het de rechten op gebruikte foto's en teksten heeft. We mogen inhoud weigeren of verwijderen die misleidend, onwettig of beledigend is, of die niet over het bedrijf gaat.</p>
      <h2>6. Reviews en offerteaanvragen</h2>
      <p>Reviews worden geplaatst volgens ons reviewbeleid. Een bedrijf kan reageren en een review melden; we verwijderen een review alleen als hij tegen het beleid ingaat. Offerteaanvragen die via het profiel binnenkomen worden rechtstreeks aan het bedrijf doorgestuurd en niet aan anderen verkocht. We garanderen geen aantal aanvragen, bezoekers of een positie in zoekmachines of AI-assistenten.</p>
      <h2>7. Sortering</h2>
      <p>Geverifieerde profielen staan boven niet-geclaimde vermeldingen; daarbinnen sorteren we op reviewscore en afstand. Een positie is niet te koop.</p>
      <h2>8. Beëindiging en verwijdering</h2>
      <p>Een bedrijf kan zijn profiel op elk moment laten verwijderen via het dashboard of via info@{v.domain}. Bij misbruik, fraude of herhaalde schending van deze voorwaarden mogen we een profiel direct beëindigen zonder restitutie.</p>
      <h2>9. Aansprakelijkheid</h2>
      <p>We doen ons best de gids juist en beschikbaar te houden, maar geven geen garantie op volledigheid of ononderbroken beschikbaarheid. Onze aansprakelijkheid is beperkt tot het bedrag dat het bedrijf in de twaalf maanden voor de schade aan ons heeft betaald.</p>
      <h2>10. Overig</h2>
      <p>Op deze voorwaarden is Nederlands recht van toepassing. We kunnen de voorwaarden wijzigen; bij een wezenlijke wijziging informeren we bedrijven per e-mail ten minste dertig dagen vooraf. Vragen: info@{v.domain}. YourFellow B.V., Nederland.</p>
    </main>
  );
}
