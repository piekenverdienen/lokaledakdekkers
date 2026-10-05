import type { Metadata } from "next";
import { currentVertical, cap } from "@/lib/site";
import { one } from "@/lib/db";

export const metadata: Metadata = {
  title: "Voor dakdekkers: claim je profiel, geverifieerd voor 79,95 per jaar",
  description: "Jouw bedrijf staat al op Lokale Dakdekkers. Claim het, laat je profiel automatisch opbouwen uit je website en sta geverifieerd online voor 79,95 per jaar inclusief btw. Geen handwerk, geen doorverkochte leads.",
  alternates: { canonical: "/voor-dakdekkers/" },
};

export default async function VoorDakdekkers() {
  const v = await currentVertical();
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const priceText = (price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const stats = await one<{ n: number; verified: number }>("select count(*)::int as n, count(*) filter (where status in ('claimed','pro'))::int as verified from businesses where vertical_id=$1 and status<>'hidden'", [v.id]);
  return (
    <main>
      <section className="hero-bg"><div className="wrap hero" style={{ paddingBottom: 32 }}>
        <div>
          <span className="eyebrow">Voor {v.name_plural}</span>
          <h1>Jouw bedrijf staat er al op. Maak er een profiel van dat werk oplevert.</h1>
          <p className="lede" style={{ fontSize: 19 }}>{stats?.n.toLocaleString("nl-NL")} {v.name_plural} uit het KvK Handelsregister staan op de kaart van Nederland. Wie zijn profiel claimt, krijgt een compleet en gecontroleerd profiel dat bezoekers kunnen vertrouwen en dat gebouwd is om door Google en AI-assistenten gelezen te worden.</p>
          <div className="actions"><a href="/claim/" className="btn btn-primary" style={{ fontSize: 17, minHeight: 50 }}>Zoek je bedrijf en claim het</a><a href="#aanbod" className="btn btn-ghost">Bekijk het aanbod</a></div>
        </div>
        <div className="hero-photo"><video controls playsInline preload="metadata" poster="/video/claim-poster.webp" style={{ width: "100%", borderRadius: 20, display: "block", background: "#0E2A3F" }}><source src="/video/claim.mp4" type="video/mp4" />Je browser kan deze video niet afspelen.</video></div>
      </div></section>

      <section className="wrap" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <h2>Zo werkt het, in twee minuten</h2>
        <ol className="grid cols-3" style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
          <li className="card"><b style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, color: "var(--amber-ink)" }}>1</b><h3 style={{ margin: "6px 0" }}>Zoek je bedrijf</h3><p style={{ color: "var(--ink-2)" }}>Op naam, plaats of KvK-nummer. Klik op "Dit is mijn bedrijf".</p></li>
          <li className="card"><b style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, color: "var(--amber-ink)" }}>2</b><h3 style={{ margin: "6px 0" }}>Website en e-mail</h3><p style={{ color: "var(--ink-2)" }}>We controleren automatisch of de site van jou is en sturen een inloglink. Daarna bouwen we je profiel uit je website: logo, foto's, diensten, werkgebied.</p></li>
          <li className="card"><b style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, color: "var(--amber-ink)" }}>3</b><h3 style={{ margin: "6px 0" }}>Nakijken en online</h3><p style={{ color: "var(--ink-2)" }}>Elk blok heeft een potlood. Klopt het, dan betaal je via iDEAL en staat je profiel direct online.</p></li>
        </ol>
      </section>

      <section id="aanbod" className="wrap" style={{ paddingTop: 8, paddingBottom: 48 }}>
        <h2>Het aanbod, zonder kleine lettertjes</h2>
        <div className="grid cols-3" style={{ marginTop: 16, alignItems: "stretch" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3>Basisvermelding</h3>
            <b style={{ fontSize: 26, fontFamily: "Manrope, sans-serif" }}>Gratis</b>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", fontSize: 15 }}><li>Naam, plaats, KvK-nummer en startdatum uit het Handelsregister</li><li>Staat op de kaart en op de plaatspagina's, onderaan</li><li>Gratis correcties doorgeven</li></ul>
            <span className="srnote">Dit is wat er nu staat, zonder dat je iets doet.</span>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, border: "2px solid var(--amber)" }}>
            <h3>Geverifieerd profiel</h3>
            <b style={{ fontSize: 26, fontFamily: "Manrope, sans-serif" }}>{priceText} euro per jaar</b>
            <span className="srnote">Inclusief btw, via iDEAL, geen automatische incasso.</span>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", fontSize: 15 }}>
              <li>Compleet profiel: logo, tot 6 projectfoto's, diensten, werkgebied, keurmerken, beschrijving</li>
              <li>Label Geverifieerd, met uitleg wat gecontroleerd is</li>
              <li>Link naar je website</li>
              <li>Reviews verzamelen, met factuurbewijs</li>
              <li>Offerteblok op je profiel: aanvragen komen rechtstreeks bij jou, worden niet doorverkocht</li>
              <li>Boven de niet-geclaimde bedrijven in de lijsten</li>
            </ul>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3>Pro</h3>
            <b style={{ fontSize: 26, fontFamily: "Manrope, sans-serif" }}>Binnenkort</b>
            <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink-2)", fontSize: 15 }}><li>Bovenaan in je hele werkgebied</li><li>Offerteaanvragen vanaf de plaatspagina's (maximaal 3 bedrijven per aanvraag)</li><li>WhatsApp-knop, 30 foto's, statistieken</li></ul>
            <span className="srnote">Komt zodra er genoeg geverifieerde bedrijven per regio zijn.</span>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16, display: "grid", gap: 10, fontSize: 15, color: "var(--ink-2)" }}>
          <div><b style={{ color: "var(--ink)" }}>Wat verificatie inhoudt.</b> We controleren dat het bedrijf actief is ingeschreven bij de KvK en dat jij de eigenaar bent: je website moet je bedrijfsnaam of KvK-nummer tonen en je e-mailadres moet bij die website horen. Het label zegt niets over de kwaliteit van je werk; dat doen reviews met factuurbewijs.</div>
          <div><b style={{ color: "var(--ink)" }}>Verlenging en opzeggen.</b> Je betaalt één jaar vooruit. Dertig dagen voor het einde krijg je een mail; verlengen is één klik, niet verlengen is niets doen. Geen incasso, geen stilzwijgende verlenging.</div>
          <div><b style={{ color: "var(--ink)" }}>Als je niet betaalt.</b> Dan blijft de gratis basisvermelding staan zoals nu, met de KvK-gegevens. Je ingevulde profiel bewaren we, zodat je later alsnog kunt publiceren.</div>
          <div><b style={{ color: "var(--ink)" }}>Hoe we sorteren.</b> Geverifieerde profielen staan boven niet-geclaimde, daarbinnen op reviewscore en afstand. Een hogere plek betekent dat het bedrijf geverifieerd is, niet dat het beter is.</div>
          <div><b style={{ color: "var(--ink)" }}>Voorwaarden.</b> De volledige <a href="/voorwaarden/">algemene voorwaarden voor bedrijven</a>.</div>
          <div><b style={{ color: "var(--ink)" }}>Google en AI-assistenten.</b> Elk profiel heeft gestructureerde data en een vaste, controleerbare opbouw, zodat zoekmachines en AI-assistenten het kunnen lezen en citeren. We beloven geen positie of vermelding; wel een compleet, actueel en controleerbaar profiel.</div>
        </div>
      </section>

      <section className="band"><div className="wrap">
        <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 14 }}>
          <h2>Twee minuten, geen handwerk</h2>
          <p>{stats?.verified ? `${stats.verified} ${v.name_plural} gingen je voor.` : `Wees de eerste geverifieerde ${v.name_singular} in jouw regio.`} Zoek je bedrijf en claim het.</p>
          <div className="actions"><a href="/claim/" className="btn btn-amber">Claim je profiel</a><a href="/corrigeren/" className="btn btn-ghost" style={{ color: "#fff" }}>Alleen gegevens corrigeren</a></div>
        </div>
        <div style={{ flex: "1 1 360px" }}><img src="/img/kennis/epdm-dakbedekking-sm.webp" alt="Dakdekker Bart Veldhuis brengt EPDM-dakbedekking aan op een plat dak" title="EPDM leggen op een plat dak" style={{ width: "100%", borderRadius: 16, display: "block" }} loading="lazy" /></div>
      </div></section>
    </main>
  );
}
