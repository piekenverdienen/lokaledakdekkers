import Map from "@/components/Map";
import { ArticleCard } from "@/components/ArticleView";
import { getAllArticles } from "@/lib/kennis";
import { getProvinces, q } from "@/lib/db";
import { currentVertical, cap } from "@/lib/site";
import { cookies } from "next/headers";
import NearbyVerified from "@/components/NearbyVerified";


export default async function Home() {
  const v = await currentVertical();
  const provinces = await getProvinces(v.id);
  const totals = await q<{ businesses: number; verified: number; places: number }>(`
    select (select count(*)::int from businesses where vertical_id=$1 and status<>'hidden') as businesses,
           (select count(*)::int from businesses where vertical_id=$1 and status in ('claimed','pro')) as verified,
           (select count(*)::int from place_stats where vertical_id=$1 and business_count>=3) as places`, [v.id]);
  const t = totals[0];
  const priceText = (((v as unknown as { verified_price_year_cents?: number }).verified_price_year_cents ?? 7995) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const lastPlace = (await cookies()).get("ld_place")?.value ?? "";
  const featured = ["wat-kost-een-dakdekker", "betrouwbare-dakdekker-kiezen", "plat-dak-vervangen-kosten"].map((s) => getAllArticles().find((a) => a.slug === s)).filter(Boolean);
  const munis = await q<{ name: string; slug: string; province_slug: string; lat: number; lng: number; business_count: number }>(`
    select m.name, m.slug, pr.slug as province_slug, st_y(st_centroid(m.geom)) as lat, st_x(st_centroid(m.geom)) as lng, count(b.id)::int as business_count
    from municipalities m join provinces pr on pr.id=m.province_id
    left join businesses b on b.municipality_id=m.id and b.vertical_id=$1 and b.status<>'hidden'
    group by m.id, pr.slug having count(b.id)>0`, [v.id]);

  return (
    <main>
      <div className="hero-bg"><section className="wrap hero">
        <div>
          <h1>Weet wie je het dak op laat.</h1>
          <p className="lede" style={{ fontSize: 20 }}>Bekijk {v.name_plural} in jouw buurt. Vergelijk hun diensten, bekijk hun werk en zie welke bedrijfsgegevens zijn gecontroleerd.</p>
          <label htmlFor="zoek" className="search-label" style={{ marginTop: 22 }}>Waar zoek je een {v.name_singular}?</label>
          <form className="search" action="/zoeken/" method="get">
            <input id="zoek" name="q" type="text" placeholder="Plaats, postcode of bedrijfsnaam" autoComplete="off" />
            <button type="submit" className="btn btn-primary">Zoek<span className="btn-long"> {v.name_singular}</span></button>
          </form>
          <a href={`/betrouwbare-${v.name_singular}/`} style={{ display: "inline-block", marginTop: 14, fontWeight: 600 }}>Zo controleren we bedrijfsgegevens</a>
        </div>
        <div className="hero-photo">
          <img src="/img/hero-bart.webp" srcSet="/img/hero-bart-sm.webp 720w, /img/hero-bart.webp 1600w" sizes="(max-width: 760px) 100vw, 560px" alt={`${cap(v.name_singular)} legt nieuwe dakpannen op het dak van een rijtjeshuis in een Nederlandse woonwijk`} loading="eager" />
        </div>
      </section></div>

      <section className="wrap section-tight">
        <div className="benefits">
          <div><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg><h3>Dichtbij zoeken</h3><p>Bekijk bedrijven die in jouw omgeving werken.</p></div>
          <div><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg><h3>Het bedrijf leren kennen</h3><p>Bekijk diensten, projecten en bedrijfsinformatie.</p></div>
          <div><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="9" /></svg><h3>Controles begrijpen</h3><p>Zie welke gegevens zijn gecontroleerd en wat dat betekent.</p></div>
        </div>
      </section>

      <section className="wrap section-tight" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2>Leer de {v.name_plural} uit jouw buurt kennen.</h2>
        <NearbyVerified v={v} place={lastPlace || undefined} />
      </section>

      <section className="wrap section-tight" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h2>Hoe het werkt</h2>
        <ol className="steps">
          <li><b>Zoek in jouw omgeving.</b><span>Vul een plaats of postcode in.</span></li>
          <li><b>Bekijk de bedrijven.</b><span>Lees over hun diensten, werk en gecontroleerde gegevens.</span></li>
          <li><b>Neem zelf contact op.</b><span>Bel, app of vraag een offerte aan bij het bedrijf dat bij je past.</span></li>
        </ol>
      </section>

      <section className="wrap section-tight" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2>Wat weet je al voordat je contact opneemt?</h2>
        <div className="trust">
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6B3A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></svg><span><b>KvK-inschrijving gecontroleerd</b>Het bedrijf staat actief ingeschreven in het Handelsregister, met de datum van de controle erbij.</span></div>
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6B3A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg><span><b>Profiel bevestigd door het bedrijf</b>Een vertegenwoordiger heeft het profiel bevestigd via de website en het e-mailadres van het bedrijf.</span></div>
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6B3A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h10M4 17h7" /></svg><span><b>Reviews met opdrachtbewijs</b>Reviews die aan een factuur gekoppeld zijn krijgen een label; de factuur zelf blijft privé.</span></div>
        </div>
        <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Een controle van bedrijfsgegevens is geen garantie op de kwaliteit van het dakwerk. <a href={`/betrouwbare-${v.name_singular}/`}>Lees hoe de controles werken</a>.</p>
      </section>

      <section className="wrap section-tight" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2>Goed voorbereid je dak laten aanpakken.</h2>
          <a href="/kennis/" style={{ fontWeight: 600 }}>Alle artikelen</a>
        </div>
        <div className="grid cols-3">{featured.map((a) => <ArticleCard key={a!.slug} a={a!} />)}</div>
      </section>

      <section className="wrap section-tight" id="provincies" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <h2>Vind een {v.name_singular} in jouw regio.</h2>
        <div className="grid cols-4">
          {provinces.map((p) => (
            <a key={p.id} href={`/${p.slug}/`} className="card card-link">
              <b>{p.name}</b>
              <small>{p.business_count > 0 ? `${p.business_count} ${v.name_plural}, ` : ""}{p.municipality_count} gemeenten</small>
            </a>
          ))}
        </div>
        <div className="map-card">
          <Map center={[52.2, 5.4]} zoom={7} fit={false} tall cluster markers={munis.map((m) => ({
            lat: m.lat, lng: m.lng, label: `${m.name} (${m.business_count})`, count: m.business_count, href: `/${m.province_slug}/${m.slug}/`,
          }))} />
          <div className="map-foot"><span>{t.businesses.toLocaleString("nl-NL")} {v.name_plural} in heel Nederland. Tik op een gemeente voor de bedrijven daar.</span></div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="eyebrow" style={{ color: "#E2B59E" }}>Voor {v.name_plural}</span>
            <h2>Goed werk verdient een gezicht.</h2>
            <p>Laat zien wie je bent, waar je werkt en welk dakwerk je uitvoert. Claim je bedrijfsprofiel en vul het aan met je diensten en projecten. {priceText} euro per jaar inclusief btw, twaalf maanden, geen incasso.</p>
            <div className="actions">
              <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
              <a href="/voor-dakdekkers/" className="btn btn-ghost" style={{ color: "#fff" }}>Bekijk hoe het werkt</a>
            </div>
          </div>
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <video controls playsInline preload="none" poster="/video/claim-poster.webp" style={{ width: "100%", borderRadius: 16, display: "block", background: "#142E3A" }}><source src="/video/claim.mp4" type="video/mp4" /></video>
          </div>
        </div>
      </section>
    </main>
  );
}
