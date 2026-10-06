import type { Metadata } from "next";
import { currentVertical, cap } from "@/lib/site";
import { one } from "@/lib/db";
import Roofline from "@/components/Roofline";

export const metadata: Metadata = {
  title: "Voor dakdekkers: goed werk verdient een gezicht",
  description: "Maak van je bedrijfsvermelding op Lokale Dakdekkers een compleet profiel: vindbaar in Google, leesbaar voor ChatGPT, met je eigen foto's en een offerteplek. Eén vast bedrag van 79,95 per jaar inclusief btw.",
  alternates: { canonical: "/voor-dakdekkers/" },
};

const Check = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#C76B46" /><path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;

export default async function VoorDakdekkers() {
  const v = await currentVertical();
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const priceText = (price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const stats = await one<{ n: number; verified: number }>("select count(*)::int as n, count(*) filter (where status in ('claimed','pro'))::int as verified from businesses where vertical_id=$1 and status<>'hidden' and source<>'test'", [v.id]);
  const faq = [
    ["Wat wordt er precies gecontroleerd?", "We controleren of je bedrijf actief staat ingeschreven bij de KvK en of jij het profiel mag beheren: je bedrijfsnaam of KvK-nummer staat op je website, en je bevestigt via een e-mailadres dat bij die website hoort. Het label zegt niets over de kwaliteit van je dakwerk; dat doen reviews met factuurbewijs."],
    ["Wat gebeurt er na het eerste jaar?", "Dertig dagen voor het einde krijg je een mail. Verlengen is één klik en opnieuw " + priceText + " euro. Doe je niets, dan valt je profiel terug naar de gratis basisvermelding; je foto's en teksten bewaren we. Geen incasso, geen stilzwijgende verlenging."],
    ["Wat als mijn bedrijf er nog niet tussen staat?", "Alle actieve dakdekkersbedrijven uit het Handelsregister staan erin. Staat je bedrijf onder een andere activiteit ingeschreven, mail dan je KvK-nummer naar info@" + v.domain + "; we voegen het toe."],
    ["Word ik gegarandeerd gevonden via Google of AI?", "Nee, niemand kan dat garanderen. Wat we wel doen: je profiel krijgt een eigen pagina die Google indexeert en gestructureerde data die AI-assistenten kunnen lezen. Gratis vermeldingen staan op noindex en hebben dat niet. Hoe completer je profiel, hoe meer er te vinden is."],
    ["Wat kost een offerteaanvraag?", "Niets extra. Aanvragen komen rechtstreeks bij jou binnen, hoeveel het er ook zijn. We verkopen ze niet door en sturen ze niet naar concurrenten."],
  ];
  return (
    <main className="vd">
      <section className="vd-hero"><div className="wrap vd-hero-in">
        <div className="vd-hero-text">
          <span className="eyebrow">Voor {v.name_plural}</span>
          <h1>Goed werk verdient een gezicht.</h1>
          <p className="lede">Maak van je vermelding een compleet profiel. Laat je werk zien en laat klanten rechtstreeks contact opnemen.</p>
          <form className="search vd-search" action="/claim/" method="get">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ marginLeft: 8, color: "var(--ink-3)", flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input name="q" placeholder="Bedrijfsnaam of plaats" aria-label="Zoek je bedrijf" />
            <button className="btn btn-amber" type="submit">Zoek je bedrijf</button>
          </form>
          <p className="vd-pricefact"><b>{priceText}</b> euro per jaar, inclusief btw</p>
          <ul className="vd-facts">
            <li><img src="/img/chatgpt-logo.png" alt="" width={18} height={18} /> Vergroot je zichtbaarheid op Google en ChatGPT</li>
            <li>Geen incasso</li>
            <li>Eerst controleren, daarna betalen</li>
          </ul>
        </div>
        <div className="vd-card" aria-label="Zo kan jouw profiel eruitzien">
          <span className="vd-tag">Zo kan jouw profiel eruitzien</span>
          <img src="/img/hero-bart.webp" alt="" className="vd-card-hero" />
          <div className="vd-card-head"><span className="vd-initials" style={{ background: "#fff", border: "1px solid var(--line)", padding: 3 }}><img src="/img/voorbeeld-logo.webp" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></span><div><b>Veldhuis Dakwerken</b><small>Pannendak, plat dak, dakkapel</small></div></div>
          <div className="vd-card-photos"><img src="/img/kennis/dakkapel-kosten-sm.webp" alt="" /><img src="/img/kennis/epdm-dakbedekking-sm.webp" alt="" /><img src="/img/kennis/dakinspectie-sm.webp" alt="" /></div>
          <div className="vd-card-btns"><span className="btn btn-primary">Bel het bedrijf</span><span className="btn btn-outline">Vraag een offerte aan</span></div>
          <a href="/voorbeeld/" style={{ textAlign: "center", fontWeight: 600, fontSize: 15 }}>Bekijk een compleet voorbeeldprofiel</a>
        </div>
      </div></section>

      <section className="vd-strip"><div className="wrap vd-strip-in">
        <div><span className="vd-ico">G</span><div><b>Zichtbaar in Google</b><span>Een eigen pagina die Google indexeert, met je naam, plaats en diensten.</span></div></div>
        <div><span className="vd-ico"><img src="/img/chatgpt-logo.png" alt="" width={26} height={26} /></span><div><b>Zichtbaar op ChatGPT</b><span>Gestructureerde bedrijfsdata die AI-assistenten kunnen lezen en citeren.</span></div></div>
        <div><span className="vd-ico">€</span><div><b>Eigen profiel en offerteplek</b><span>Klanten vragen rechtstreeks bij jou een offerte aan. Eén vast jaarbedrag.</span></div></div>
      </div></section>

      <section className="vd-ai"><div className="wrap vd-ai-in">
        <div className="vd-ai-text">
          <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><img src="/img/chatgpt-logo.png" alt="" width={20} height={20} /> ChatGPT en AI-assistenten</span>
          <h2>Jouw klanten zoeken steeds vaker via ChatGPT.</h2>
          <p>Vermeldingen op externe sites zoals {v.domain} verstevigen jouw positie: AI-assistenten halen hun antwoorden uit gidsen met gestructureerde, gecontroleerde bedrijfsgegevens. Claim jouw profiel en vergroot de kans op nieuwe klanten in 2027.</p>
          <p className="vd-ai-urgent"><b>Claim als eerste in jouw plaats.</b> Wie het eerst claimt, staat bovenaan in de lijst van zijn plaats en in de plaatsen eromheen.</p>
          <a href="/claim/" className="btn btn-amber" style={{ alignSelf: "flex-start" }}>Zoek je bedrijf</a>
        </div>
        <figure className="vd-ai-figure">
          <img src="/video/claim-poster.webp" alt="Voorbeeld van een AI-assistent die drie dakdekkers uit Twente noemt met lokaledakdekkers.nl als bron" loading="lazy" />
          <figcaption>Illustratie: zo kan een antwoord eruitzien als jouw profiel compleet is.</figcaption>
        </figure>
      </div></section>

      <section className="wrap section-tight">
        <h2>Dit krijgen klanten van jouw bedrijf te zien.</h2>
        <div className="vd-tiles">
          <div><div className="vd-tile-img vd-grid3"><img src="/img/kennis/dakkapel-kosten-sm.webp" alt="" /><img src="/img/kennis/plat-dak-vervangen-kosten-sm.webp" alt="" /><img src="/img/kennis/dakpannen-vervangen-kosten-sm.webp" alt="" /><img src="/img/kennis/bitumen-dakbedekking-sm.webp" alt="" /></div><h3>Je werk in beeld</h3><p>Je logo, diensten en foto's van je projecten op één plek.</p></div>
          <div><div className="vd-tile-img vd-btns"><span className="btn btn-primary">Bel het bedrijf</span><span className="btn btn-green">WhatsApp</span><span className="btn btn-outline">Vraag een offerte aan</span></div><h3>Een directe lijn naar jou</h3><p>Bellen, WhatsApp en offerteaanvragen via jouw profiel, zonder tussenpartij.</p></div>
          <div><div className="vd-tile-img vd-info"><b>Over Veldhuis Dakwerken</b><div><small>Werkgebied</small>Deventer en omgeving, 30 km</div><div><small>Diensten</small>Pannendak, plat dak, dakkapel</div><div><small>KvK-nummer</small>08123456, gecontroleerd</div></div><h3>Duidelijke bedrijfsinformatie</h3><p>Je werkgebied en gecontroleerde gegevens inzichtelijk voor bewoners.</p></div>
        </div>
      </section>

      <section className="wrap section-tight">
        <h2>Van vermelding naar jouw eigen profiel.</h2>
        <ol className="vd-steps">
          <li><span className="step-num">1</span><div><h3>Zoek je bedrijf</h3><p>Op naam, plaats of KvK-nummer. Je staat er al in.</p></div></li>
          <li><span className="step-num">2</span><div><h3>Maak je profiel compleet</h3><p>Website en e-mail invullen; we bouwen je profiel uit je site. Jij vult aan met foto's.</p></div></li>
          <li><span className="step-num">3</span><div><h3>Controleer en publiceer</h3><p>Bekijk je profiel, rond de betaling af via iDEAL en je staat online.</p></div></li>
        </ol>
      </section>

      <section className="vd-dark"><div className="wrap vd-dark-in">
        <div>
          <h2>Alles voor een compleet bedrijfsprofiel.</h2>
          <ul className="vd-checks">
            <li><Check /> Eigen bedrijfspagina, vindbaar in Google</li>
            <li><Check /> Logo, diensten en werkgebied tot 30 km</li>
            <li><Check /> Tot 6 foto's van je werk, uploaden vanaf je telefoon</li>
            <li><Check /> Telefoon, WhatsApp en offerteaanvragen</li>
            <li><Check /> Reviews verzamelen en reageren</li>
            <li><Check /> Inzicht in bezoekers en aanvragen</li>
          </ul>
          <p className="vd-dark-note">Je basisvermelding blijft gratis. Met een geclaimd profiel laat je meer van je bedrijf zien.</p>
        </div>
        <div className="vd-pricecard">
          <b>{priceText}</b><span>euro per jaar, inclusief btw</span>
          <a href="/claim/" className="btn btn-amber" style={{ fontSize: 17, minHeight: 52 }}>Zoek je bedrijf</a>
          <small>Eén jaar vooruit. Geen automatische verlenging.</small>
          <a href="#verschillen">Bekijk alle verschillen</a>
        </div>
      </div></section>

      <section className="wrap section-tight" id="verschillen">
        <details className="vd-table">
          <summary>Gratis vermelding of geclaimd profiel: alle verschillen</summary>
          <table>
            <thead><tr><th></th><th>Gratis</th><th>Geclaimd, {priceText} per jaar</th></tr></thead>
            <tbody>
              {[["Pagina vindbaar in Google en voor AI-assistenten","Nee","Ja"],["Logo, beschrijving, diensten, werkgebied","Alleen naam, plaats en KvK","Ja"],["Foto's van je werk","Nee","Tot 6"],["Telefoon, WhatsApp, website-link","Nee","Ja"],["Offerteaanvragen","Nee","Rechtstreeks naar jou"],["Zichtbaar in plaatsen rondom je","Alleen eigen plaats","Tot 30 km"],["Positie in de lijsten","Onderaan","Bovenaan, met label"],["Reviews","Nee","Verzamelen, uitnodigen, reageren"],["Vermelding bij kennisartikelen","Nee","Ja"],["Badge voor je eigen website","Nee","Ja"],["Delen op social media","Nee","Eigen deelafbeelding"],["Beschikbaarheid en spoed","Nee","Ja"],["Inzicht in bezoekers en aanvragen","Nee","Ja"],["Factuur met btw","Niet van toepassing","Direct na betaling"]].map(([a, b, c]) => <tr key={a}><td>{a}</td><td>{b}</td><td>{c}</td></tr>)}
            </tbody>
          </table>
          <p style={{ fontSize: 15, color: "var(--ink-2)", marginTop: 12 }}>Verificatie: KvK-inschrijving en eigenaarschap via website en e-mail. Verlenging: mail 30 dagen vooraf, één klik, anders niets. Zonder betaling blijft de gratis vermelding staan en bewaren we je profiel. Sortering: geclaimde profielen eerst, daarna op reviewscore en afstand. <a href="/voorwaarden/">Algemene voorwaarden</a>.</p>
        </details>
      </section>

      <section className="wrap section-tight">
        <h2>Nog even dit.</h2>
        <div className="vd-faq">{faq.map(([q, a], i) => <details key={q} open={i === 0}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="wrap section-tight">
        <h2 style={{ fontSize: 22, marginBottom: 10 }}>In dertig seconden</h2>
        <video controls playsInline preload="none" poster="/video/claim-poster.webp" style={{ width: "100%", maxWidth: 720, borderRadius: 16, display: "block", background: "#142E3A" }}><source src="/video/claim.mp4" type="video/mp4" /></video>
      </section>

      <section className="vd-final"><div className="wrap vd-final-in">
        <h2>Laat zien wie je bent. En wat je maakt.</h2>
        <a href="/claim/" className="btn btn-amber" style={{ fontSize: 17, minHeight: 52 }}>Zoek je bedrijf</a>
        <div className="vd-final-roof"><Roofline color="#E2B59E" accent="#C76B46" height={40} /></div>
        <p className="srnote">{stats?.n.toLocaleString("nl-NL")} {v.name_plural} staan in de gids{stats?.verified ? `, ${stats.verified} met een geclaimd profiel` : ""}. {cap(v.name_singular)} in een andere branche? Mail info@{v.domain}.</p>
      </div></section>
    </main>
  );
}
