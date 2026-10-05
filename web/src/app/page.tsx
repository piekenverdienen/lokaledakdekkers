import Map from "@/components/Map";
import { ArticleCard } from "@/components/ArticleView";
import { getAllArticles } from "@/lib/kennis";
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
  const priceText = (((v as unknown as { verified_price_year_cents?: number }).verified_price_year_cents ?? 7995) / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const realExamples = await q<{ name: string; slug: string; city: string | null; logo_url: string | null; photo: string | null; services: string[]; review_count: number; area_count: number }>(`
    select b.name, b.slug, b.city, b.logo_url, (select url from business_photos p where p.business_id=b.id order by sort_order limit 1) as photo,
      coalesce((select array_agg(service_slug) from business_services s where s.business_id=b.id), '{}') as services,
      (select count(*)::int from reviews r where r.business_id=b.id and r.status='published') as review_count,
      (select count(*)::int from business_areas a where a.business_id=b.id) as area_count
    from businesses b where b.vertical_id=$1 and b.status in ('claimed','pro') order by random() limit 3`, [v.id]);
  const examples = realExamples.length >= 3 ? {
    real: true,
    items: realExamples.map((r) => ({ slug: r.slug, name: r.name, city: r.city ?? "", area: r.area_count ? `${r.area_count} plaatsen` : "eigen plaats", verified: true, photo: r.photo ?? "/img/dakpan-handen-sm.webp", services: r.services.slice(0, 3).map((x) => v.services.find((y) => y.slug === x)?.name ?? x), reviews: r.review_count ? `${r.review_count} reviews` : "Nog geen reviews", href: `/bedrijf/${r.slug}/` })),
  } : { real: false, items: [] as { slug: string; name: string; city: string; area: string; verified: boolean; photo: string; services: string[]; reviews: string; href: string }[] };
  const featured = ["wat-kost-een-dakdekker", "betrouwbare-dakdekker-kiezen", "plat-dak-vervangen-kosten"].map((s) => getAllArticles().find((a) => a.slug === s)).filter(Boolean);
  const cities = await q<{ name: string; slug: string; municipality_slug: string; province_slug: string; lat: number; lng: number; business_count: number }>(`
    select p.name, p.slug, m.slug as municipality_slug, pr.slug as province_slug, st_y(p.geom) as lat, st_x(p.geom) as lng, ps.business_count::int
    from place_stats ps join places p on p.id=ps.place_id join municipalities m on m.id=p.municipality_id join provinces pr on pr.id=m.province_id
    where ps.vertical_id=$1 and p.place_type in ('city','town') order by p.population desc nulls last limit 40`, [v.id]);

  return (
    <main>
      <div className="hero-bg"><section className="wrap hero">
        <div>
          <span className="eyebrow">Alle {v.name_plural} van Nederland op één kaart</span>
          <h1>Vind een {v.name_singular} in de buurt en weet wat je kiest</h1>
          <p className="lede" style={{ fontSize: 19 }}>
            Bekijk {v.name_plural} in jouw buurt en vergelijk hun diensten, werkgebied en bedrijfsgegevens. Bij geverifieerde profielen zie je precies welke gegevens zijn gecontroleerd.
          </p>
          <form className="search" action="/zoeken/" method="get">
            <label htmlFor="zoek" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Plaats of bedrijfsnaam</label>
            <input id="zoek" name="q" type="text" placeholder="Plaats, postcode of bedrijfsnaam" autoComplete="off" />
            <button type="submit" className="btn btn-primary">Zoek<span className="btn-long"> {v.name_singular}</span></button>
          </form>
          <div className="stats">
            <div><b>{t.businesses.toLocaleString("nl-NL")}</b><small>{v.name_plural} in heel Nederland</small></div>
            <div><b>350</b><small>gemeenten, van Groningen tot Maastricht</small></div>
            {t.verified > 0 && <div><b>{t.verified.toLocaleString("nl-NL")}</b><small>geverifieerde profielen</small></div>}
          </div>
        </div>
        <div className="hero-photo">
          <img src="/img/hero-pannendak.webp" srcSet="/img/hero-pannendak-sm.webp 720w, /img/hero-pannendak.webp 1344w" sizes="(max-width: 760px) 100vw, 560px" alt={`${cap(v.name_singular)} legt dakpannen op een rijtjeshuis in een Nederlandse woonwijk`} loading="eager" />
        </div>
      </section></div>

      <section className="wrap" style={{ paddingTop: 28, paddingBottom: 8 }}>
        <div className="trust">
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1B6B3A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg><span><b>Wat Geverifieerd betekent</b>Het bedrijf is echt, staat ingeschreven bij de KvK en heeft dit profiel zelf bevestigd.</span></div>
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0B5C8F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></svg><span><b>Reviews met factuurbewijs</b>Reviews van echte klussen, gekoppeld aan een factuur. Geen verzonnen sterren.</span></div>
          <div><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C97A0F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h10M4 17h7" /></svg><span><b>Eerlijke sortering</b>Geverifieerde bedrijven eerst, daarna op reviewscore en afstand. Niemand koopt een hogere plek.</span></div>
        </div>
      </section>

      {examples.real && <section className="wrap" style={{ paddingTop: 32, paddingBottom: 8, display: "flex", flexDirection: "column", gap: 16 }}>
        <h2>Geverifieerde {v.name_plural}</h2>
        <div className="grid cols-3">
          {examples.items.map((e) => (
            <article key={e.slug} className="biz" style={{ padding: 0, overflow: "hidden" }}>
              <img src={e.photo} alt="" className="ex-photo" loading="lazy" />
              <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="biz-title"><h3 style={{ fontSize: 18 }}>{e.name}</h3><span className="verified">Geverifieerd</span></div>
                <div className="meta"><span>{e.city}</span><span>Werkgebied {e.area}</span></div>
                <div className="chips">{e.services.map((s) => <span key={s} className="chip">{s}</span>)}</div>
                <span className="srnote">{e.reviews}</span>
                <a href={e.href} className="btn btn-outline" style={{ alignSelf: "flex-start" }}>Bekijk bedrijfsprofiel</a>
              </div>
            </article>
          ))}
        </div>
      </section>}

      <section className="wrap" style={{ paddingTop: 32, paddingBottom: 8 }}>
        <div className="map-card">
          <Map center={[52.2, 5.4]} zoom={7} fit={false} tall cluster markers={cities.map((c) => ({
            lat: c.lat, lng: c.lng, label: `${c.name}`, count: c.business_count, href: `/${c.province_slug}/${c.municipality_slug}/${c.slug}/`,
          }))} />
          <div className="map-foot"><span>Tik op een stad voor de {v.name_plural} daar</span></div>
        </div>
      </section>

      <section className="wrap" id="provincies" style={{ paddingTop: 8, paddingBottom: 56, display: "flex", flexDirection: "column", gap: 18 }}>
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

      <section className="wrap" style={{ padding: "0 24px 56px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h2>Lees dit voordat je een {v.name_singular} belt</h2>
          <a href="/kennis/" style={{ fontWeight: 600 }}>Alle artikelen</a>
        </div>
        <div className="grid cols-3">{featured.map((a) => <ArticleCard key={a!.slug} a={a!} />)}</div>
      </section>

      <section className="band">
        <div className="wrap">
          <div style={{ flex: "1 1 400px", display: "flex", flexDirection: "column", gap: 14 }}>
            <span className="eyebrow" style={{ color: "var(--amber-light)" }}>Voor {v.name_plural}</span>
            <h2>Jouw bedrijf staat er al op. Maak er een geverifieerd profiel van.</h2>
            <p>Website en e-mailadres invullen, wij bouwen je profiel uit je website met logo, foto's en diensten. Nakijken, betalen via iDEAL, online. {priceText} euro per jaar inclusief btw, geen incasso, geen doorverkochte leads.</p>
            <div className="actions">
              <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
              <a href="/voor-dakdekkers/" className="btn btn-ghost" style={{ color: "#fff" }}>Alles over het aanbod</a>
            </div>
          </div>
          <div style={{ flex: "1 1 360px", minWidth: 0 }}>
            <img src="/img/offerte-voordeur-sm.webp" alt="Dakdekker bespreekt een offerte met een bewoner bij de voordeur" style={{ width: "100%", borderRadius: 16, display: "block" }} loading="lazy" />
          </div>
        </div>
      </section>
    </main>
  );
}
