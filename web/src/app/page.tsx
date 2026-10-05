import Map from "@/components/Map";
import { getProvinces, q } from "@/lib/db";
import { currentVertical, cap } from "@/lib/site";

export const revalidate = 3600;

export default async function Home() {
  const v = await currentVertical();
  const provinces = await getProvinces(v.id);
  const totals = await q<{ businesses: number; verified: number; places: number }>(`
    select (select count(*)::int from businesses where vertical_id=$1 and status<>'hidden') as businesses,
           (select count(*)::int from businesses where vertical_id=$1 and status in ('claimed','pro')) as verified,
           (select count(*)::int from place_stats where vertical_id=$1 and business_count>=3) as places`, [v.id]);
  const t = totals[0];
  const cities = await q<{ name: string; slug: string; municipality_slug: string; province_slug: string; lat: number; lng: number; business_count: number }>(`
    select p.name, p.slug, m.slug as municipality_slug, pr.slug as province_slug, st_y(p.geom) as lat, st_x(p.geom) as lng, ps.business_count::int
    from place_stats ps join places p on p.id=ps.place_id join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    where ps.vertical_id=$1 and p.place_type in ('city','town') order by p.population desc nulls last limit 40`, [v.id]);

  return (
    <main>
      <div className="hero-bg"><section className="wrap hero">
        <div>
          <span className="eyebrow">Alle {v.name_plural} van Nederland op één kaart</span>
          <h1>Vind een betrouwbare {v.name_singular} bij jou in de buurt</h1>
          <p className="lede" style={{ fontSize: 19 }}>
            Vergelijk geverifieerde {v.name_plural} in jouw plaats op reviews met factuurbewijs, foto's van uitgevoerd werk en richtprijzen per regio. Vraag in één keer 3 offertes aan.
          </p>
          <form className="search" action="/zoeken/" method="get">
            <label htmlFor="zoek" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Plaats of postcode</label>
            <input id="zoek" name="q" type="text" placeholder="Plaats of postcode, bijvoorbeeld Zwolle" autoComplete="off" />
            <button type="submit" className="btn btn-primary">Zoek {v.name_singular}</button>
          </form>
          {t.businesses > 0 ? (
            <div className="stats">
              <div><b>{t.businesses.toLocaleString("nl-NL")}</b><small>{v.name_plural} in de gids</small></div>
              <div><b>{t.places.toLocaleString("nl-NL")}</b><small>plaatsen met 3 of meer bedrijven</small></div>
              <div><b>{t.verified.toLocaleString("nl-NL")}</b><small>geverifieerde profielen</small></div>
            </div>
          ) : (
            <div className="building">In opbouw: de gids wordt deze maand gevuld met alle {v.name_plural} uit het KvK Handelsregister, provincie voor provincie. Ben je {v.name_singular}? <a href="/claim/" style={{ color: "inherit", fontWeight: 600 }}>Meld je alvast aan</a>.</div>
          )}
          <div className="trust">
            <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1B6B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg><span><b>Gecontroleerd op KvK</b>Elk geverifieerd bedrijf is gecheckt op inschrijving en websitedomein.</span></div>
            <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B5C8F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></svg><span><b>Reviews met factuurbewijs</b>Alleen reviews van echte klussen tellen mee in de score en de richtprijzen.</span></div>
            <div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C97A0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h10M4 17h7" /></svg><span><b>3 offertes, geen doorverkoop</b>Je aanvraag gaat naar maximaal drie bedrijven en je ziet vooraf welke.</span></div>
          </div>
        </div>
        <div>
          <div className="map-card">
            <Map center={[52.2, 5.4]} zoom={7} fit={false} tall markers={cities.map((c) => ({
              lat: c.lat, lng: c.lng, label: `${c.name} (${c.business_count})`, href: `/${c.province_slug}/${c.municipality_slug}/${c.slug}/`,
              size: Math.max(7, Math.min(16, 6 + Math.sqrt(c.business_count) * 1.6)),
            }))} />
            <div className="map-foot"><span>Tik op een stad voor de {v.name_plural} daar</span></div>
          </div>
        </div>
      </section></div>

      <section className="wrap" id="provincies" style={{ padding: "8px 24px 56px", display: "flex", flexDirection: "column", gap: 18 }}>
        <h2>Zoek per provincie</h2>
        <div className="grid cols-4">
          {provinces.map((p) => (
            <a key={p.id} href={`/${p.slug}/`} className="card card-link">
              <b>{p.name}</b>
              <small>{p.business_count > 0 ? `${p.business_count} ${v.name_plural}, ` : ""}{p.municipality_count} gemeenten</small>
            </a>
          ))}
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="eyebrow" style={{ color: "var(--amber-light)" }}>Voor {v.name_plural}</span>
            <h2>Jouw bedrijf staat er waarschijnlijk al op. Claim het en ontvang offerteaanvragen uit je regio.</h2>
            <p>Vul je website in en wij bouwen je complete profiel met projectfoto's in één keer. Goedkeuren, aanpassen met het potlood, live. Gratis.</p>
            <div className="actions">
              <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
              <a href="/pro/" className="btn btn-ghost" style={{ color: "#fff" }}>Wat is Pro?</a>
            </div>
          </div>
          <ol className="steps">
            <li><span>1</span><div><b>Zoek je bedrijf</b><small>Op naam, plaats of KvK-nummer</small></div></li>
            <li><span>2</span><div><b>Vul je website in</b><small>Wij halen diensten, werkgebied, projectfoto's en keurmerken op</small></div></li>
            <li><span>3</span><div><b>Keur goed en ga live</b><small>Aanpassen kan altijd met het potlood</small></div></li>
          </ol>
        </div>
      </section>
    </main>
  );
}
