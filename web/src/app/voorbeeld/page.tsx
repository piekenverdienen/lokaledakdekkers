import type { Metadata } from "next";
import { currentVertical } from "@/lib/site";
import { one } from "@/lib/db";
import Map from "@/components/Map";
export const metadata: Metadata = { title: "Voorbeeldprofiel: zo ziet een compleet bedrijfsprofiel eruit", robots: { index: false, follow: true } };

// Voorbeeldprofiel met de vaste dakdekker Bart Veldhuis. Geen echt bedrijf; staat niet in lijsten of Google.
export default async function Voorbeeld() {
  const v = await currentVertical();
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const priceText = (price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const name = "Veldhuis Dakwerken";
  const photos = ["dakpannen-vervangen-kosten", "epdm-dakbedekking", "dakkapel-kosten", "dakinspectie", "bitumen-dakbedekking", "dak-isoleren-kosten"];
  const services = ["Pannendak", "Plat dak", "EPDM", "Dakkapel", "Dakisolatie", "Dakinspectie", "Lekkage"];
  const reviews = [
    { name: "M. de Vries", score: 5, body: "Lekkage bij de schoorsteen binnen een dag verholpen. Bart belde terug toen hij zei dat hij zou bellen, kwam kijken, stuurde een duidelijke offerte met vaste prijs en deed het de week erna. Nette oplevering, dakgoot er meteen bij schoongemaakt.", service: "Lekkage", verified: true, reply: "Bedankt Marieke. Fijn dat het droog is gebleven met de storm van afgelopen week." },
    { name: "Fam. Jansen", score: 5, body: "Nieuw plat dak op de aanbouw, EPDM met isolatie. Alles in twee dagen klaar, precies zoals afgesproken. Hij legde goed uit waarom EPDM voor ons beter was dan bitumen.", service: "EPDM", verified: true, reply: null },
    { name: "R. Bakker", score: 4, body: "Dakkapel geplaatst, strak werk en de vergunning geregeld. Eén ster minder omdat de startdatum twee weken verschoof door de kraan, maar dat werd netjes gecommuniceerd.", service: "Dakkapel", verified: false, reply: "Klopt, die kraan was een tegenvaller. Bedankt voor je geduld en je eerlijke review." },
  ];
  return (
    <main className="wrap">
      <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginTop: 16, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div><b>Voorbeeldprofiel.</b> <span style={{ color: "var(--ink-2)" }}>Zo ziet een compleet, geclaimd profiel eruit. Dit bedrijf bestaat niet; de foto's en reviews zijn ter illustratie.</span></div>
        <a href="/claim/" className="btn btn-amber">Claim je eigen bedrijf</a>
      </div>
      <nav className="crumbs"><a href="/">Nederland</a><span>/</span><a href="/overijssel/deventer/">Deventer</a><span>/</span><b>{name}</b></nav>
      <div className="layout" style={{ paddingTop: 8 }}>
        <div className="main">
          <article className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="biz-head">
              <div className="logo" style={{ width: 72, height: 72, fontSize: 24, background: "var(--navy)", color: "#fff" }}>VD</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="biz-title"><h1 style={{ fontSize: 28 }}>{name}</h1><span className="verified">✓ Geverifieerd bedrijf</span></div>
                <div className="meta"><span>{v.name_singular.charAt(0).toUpperCase() + v.name_singular.slice(1)} in Deventer</span><span>KvK 08123456</span><span>Ingeschreven sinds 2003</span><span className="stars">★★★★★</span><span>4,8 uit 23 reviews</span></div>
              </div>
            </div>
            <p style={{ color: "var(--ink-2)", fontSize: 17 }}>Veldhuis Dakwerken is het dakdekkersbedrijf van Bart Veldhuis uit Deventer. Met twee vaste collega's werken we aan pannendaken, platte daken en dakkapellen in Deventer, Zutphen, Apeldoorn en de dorpen daartussen. Geen onderaannemers: wie de offerte maakt, staat ook op het dak. Lekkage? Bel, dan komen we meestal dezelfde dag kijken.</p>
            <div className="actions">
              <span className="btn btn-primary">0570 123 456</span>
              <span className="btn btn-green">WhatsApp</span>
              <a href="#offerte" className="btn btn-amber">Vraag een offerte aan</a>
              <span className="btn btn-outline">Website</span>
            </div>
            <div><h3 style={{ marginBottom: 8 }}>Diensten</h3><div className="chips">{services.map((s) => <span key={s} className="chip">{s}</span>)}</div></div>
            <div><h3 style={{ marginBottom: 8 }}>Werkgebied</h3><p style={{ color: "var(--ink-2)" }}>Deventer, Zutphen, Apeldoorn, Olst, Wijhe, Twello, Bathmen, Gorssel en Lochem.</p></div>
            <div><h3 style={{ marginBottom: 8 }}>Keurmerken en pluspunten</h3><div className="chips"><span className="chip">VCA</span><span className="chip">Dakmerk-gecertificeerd</span><span className="chip">Vaste prijs in de offerte</span><span className="chip">Zelf op het dak, geen onderaannemers</span></div></div>
          </article>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Foto's van het werk</h2>
            <div className="photos" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>{photos.map((p) => <img key={p} src={`/img/kennis/${p}-sm.webp`} alt={`Werk van ${name}`} loading="lazy" />)}</div>
          </section>
          <section id="offerte" className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 22 }}>Vraag een offerte aan bij {name}</h2>
            <p style={{ color: "var(--ink-2)" }}>Op een echt profiel staat hier het offerteformulier: wat moet er gebeuren, soort dak, oppervlakte, wanneer, foto's en je contactgegevens. De aanvraag gaat rechtstreeks naar het bedrijf.</p>
            <a href="/voor-dakdekkers/" className="btn btn-outline" style={{ alignSelf: "flex-start" }}>Zo werkt het voor bedrijven</a>
          </section>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 style={{ fontSize: 20 }}>Reviews <span style={{ fontSize: 15, fontWeight: 400, color: "var(--ink-3)" }}>4,8 uit 23 reviews, 19 met factuurbewijs</span></h2>
            {reviews.map((r) => (
              <div key={r.name} className="review">
                <div className="meta"><span className="stars">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span><b>{r.name}</b><span>{r.service}</span>{r.verified && <span className="verified">Geverifieerde klus</span>}</div>
                <p style={{ color: "var(--ink-2)" }}>{r.body}</p>
                {r.reply && <div style={{ borderLeft: "3px solid var(--amber)", paddingLeft: 12, marginTop: 6 }}><small style={{ color: "var(--ink-3)" }}>Reactie van {name}</small><p style={{ color: "var(--ink-2)", margin: "2px 0 0", fontSize: 15 }}>{r.reply}</p></div>}
              </div>
            ))}
          </section>
        </div>
        <aside className="aside">
          <div className="card" style={{ padding: 0, overflow: "hidden" }}><Map center={[52.255, 6.16]} zoom={12} markers={[{ lat: 52.255, lng: 6.16, label: name }]} /><div style={{ padding: "12px 16px", fontSize: 14, color: "var(--ink-2)" }}>7411 Deventer</div></div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>Beschikbaarheid</h2>
            <span className="badge" style={{ alignSelf: "flex-start" }}>Beschikbaar vanaf november 2026</span>
            <span className="srnote">Spoedreparaties altijd mogelijk.</span>
          </div>
          <div className="cta-navy">
            <h2 style={{ fontSize: 17 }}>Ben jij {v.name_singular}?</h2>
            <p>Dit is hoe een compleet profiel eruitziet. Jouw bedrijf staat al in de gids; claim het en vul het aan. {priceText} euro per jaar inclusief btw.</p>
            <a href="/claim/" className="btn btn-amber" style={{ alignSelf: "flex-start" }}>Claim je bedrijf</a>
          </div>
        </aside>
      </div>
    </main>
  );
}
