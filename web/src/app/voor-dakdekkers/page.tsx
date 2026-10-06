import type { Metadata } from "next";
import { currentVertical, cap } from "@/lib/site";
import { one } from "@/lib/db";

export const metadata: Metadata = {
  title: "Voor dakdekkers: goed werk verdient een gezicht",
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
          <h1>Goed werk verdient een gezicht.</h1>
          <p className="lede" style={{ fontSize: 19 }}>{stats?.n.toLocaleString("nl-NL")} {v.name_plural} uit het KvK Handelsregister staan op de kaart van Nederland. Wie zijn profiel claimt, krijgt een compleet en gecontroleerd profiel dat bezoekers kunnen vertrouwen en dat gebouwd is om door Google en AI-assistenten gelezen te worden.</p>
          <div className="actions"><a href="/claim/" className="btn btn-primary" style={{ fontSize: 17, minHeight: 50 }}>Zoek je bedrijf en claim het</a><a href="#aanbod" className="btn btn-ghost">Bekijk het aanbod</a></div>
        </div>
        <div className="hero-photo"><video controls playsInline preload="metadata" poster="/video/claim-poster.webp" style={{ width: "100%", borderRadius: 20, display: "block", background: "#142E3A" }}><source src="/video/claim.mp4" type="video/mp4" />Je browser kan deze video niet afspelen.</video></div>
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
        <h2>Gratis of geclaimd: dit is het verschil</h2>
        <div className="card" style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 15 }}>
            <thead><tr style={{ textAlign: "left", borderBottom: "2px solid var(--line)" }}><th style={{ padding: "8px 10px 8px 0" }}></th><th style={{ padding: "8px 10px" }}>Gratis vermelding</th><th style={{ padding: "8px 10px", color: "var(--amber-ink)" }}>Geclaimd profiel, {priceText} euro per jaar</th></tr></thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Pagina vindbaar in Google en voor AI-assistenten</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee, alleen in de lijst van je plaats</td><td style={{ padding: "8px 10px" }}>Ja, eigen geïndexeerde pagina met gestructureerde data</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Logo, beschrijving, diensten, werkgebied, keurmerken</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Alleen naam, plaats en KvK-nummer</td><td style={{ padding: "8px 10px" }}>Ja, uit je website opgebouwd en zelf aan te passen</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Foto's van je werk</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Tot 6 foto's, uploaden vanaf je telefoon</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Telefoon, WhatsApp en link naar je website</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Ja</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Offerteaanvragen</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee; bewoners worden doorverwezen naar geverifieerde bedrijven</td><td style={{ padding: "8px 10px" }}>Formulier op je pagina, aanvragen rechtstreeks naar jou, met foto's en adres</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Zichtbaar in plaatsen rondom je</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Alleen je eigen plaats</td><td style={{ padding: "8px 10px" }}>Tot 30 km, op alle plaatspagina's in dat gebied</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Positie in de lijsten</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Onderaan</td><td style={{ padding: "8px 10px" }}>Bovenaan, met het label Geverifieerd</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Reviews</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Verzamelen met factuurbewijs, klanten uitnodigen, reageren</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Vermelding bij kennisartikelen</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>In het blok Geverifieerde dakdekkers bij jou in de buurt, onder elk artikel</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Badge voor je eigen website</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Ja, met link naar je profiel</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Delen op social media</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Eigen deelafbeelding met je logo en knoppen</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Beschikbaarheid en spoed</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Status direct, vanaf of vol; label voor spoed</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Inzicht</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Nee</td><td style={{ padding: "8px 10px" }}>Bezoekers en aanvragen in je dashboard</td></tr>
              <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "8px 10px 8px 0", fontWeight: 600 }}>Factuur</td><td style={{ padding: "8px 10px", color: "var(--ink-3)" }}>Niet van toepassing</td><td style={{ padding: "8px 10px" }}>Met btw-specificatie, direct na betaling</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 12, fontSize: 15, color: "var(--ink-2)" }}>Inclusief btw, via iDEAL, één vast bedrag of je nu vijf of vijftig aanvragen krijgt. Geen incasso, geen stilzwijgende verlenging.</p>
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
          <h2>Laat zien wie je bent en wat je maakt</h2>
          <p>{stats?.verified ? `${stats.verified} ${v.name_plural} gingen je voor.` : `Wees de eerste geverifieerde ${v.name_singular} in jouw regio.`} Zoek je bedrijf en claim het.</p>
          <div className="actions"><a href="/claim/" className="btn btn-amber">Claim je profiel</a><a href="/corrigeren/" className="btn btn-ghost" style={{ color: "#fff" }}>Alleen gegevens corrigeren</a></div>
        </div>
        <div style={{ flex: "1 1 360px" }}><img src="/img/kennis/epdm-dakbedekking-sm.webp" alt="Dakdekker Bart Veldhuis brengt EPDM-dakbedekking aan op een plat dak" title="EPDM leggen op een plat dak" style={{ width: "100%", borderRadius: 16, display: "block" }} loading="lazy" /></div>
      </div></section>
    </main>
  );
}
