import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Map from "@/components/Map";
import BusinessCard from "@/components/BusinessCard";
import { getBusinessesInMunicipality, getMunicipality, getPageContent, getPlacesInMunicipality } from "@/lib/db";
import { baseUrl, breadcrumbSchema, businessPath, currentVertical, cap, dataFaq, faqSchema, placePath } from "@/lib/site";

export const revalidate = 86400;
type Props = { params: Promise<{ provincie: string; gemeente: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincie, gemeente } = await params;
  const v = await currentVertical();
  const m = await getMunicipality(provincie, gemeente);
  if (!m) return {};
  return {
    title: `${cap(v.name_singular)} in gemeente ${m.name}: geverifieerde bedrijven en richtprijzen`,
    description: `Alle ${v.name_plural} in de gemeente ${m.name} (${m.province_name}), met reviews met factuurbewijs, projectfoto's en richtprijzen. Vraag 3 offertes aan.`,
    alternates: { canonical: `/${m.province_slug}/${m.slug}/` },
  };
}

export default async function MunicipalityPage({ params }: Props) {
  const { provincie, gemeente } = await params;
  const v = await currentVertical();
  const m = await getMunicipality(provincie, gemeente);
  if (!m) notFound();
  const [businesses, places, content] = await Promise.all([
    getBusinessesInMunicipality(m.id, v.id), getPlacesInMunicipality(m.id, v.id), getPageContent(v.id, null, m.id),
  ]);
  const verified = businesses.filter((b) => b.status !== "unclaimed").length;
  const emergency = businesses.filter((b) => b.emergency).length;
  const scored = businesses.filter((b) => b.avg_score != null);
  const avg = scored.length ? Math.round((scored.reduce((a, b) => a + Number(b.avg_score), 0) / scored.length) * 10) / 10 : null;
  const reviewCount = businesses.reduce((a, b) => a + b.review_count, 0);
  const faq = content?.faq?.length ? content.faq : dataFaq(v, `gemeente ${m.name}`, { business_count: businesses.length, verified_count: verified, avg_score: avg, review_count: reviewCount }, emergency);
  const base = baseUrl(v);
  const schema = [
    breadcrumbSchema([{ name: "Nederland", url: `${base}/` }, { name: m.province_name, url: `${base}/${m.province_slug}/` }, { name: m.name, url: `${base}/${m.province_slug}/${m.slug}/` }]),
    faqSchema(faq),
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: businesses.slice(0, 20).map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}${businessPath(b)}`, name: b.name })) },
  ];

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="crumbs" aria-label="Kruimelpad"><a href="/">Nederland</a><span>/</span><a href={`/${m.province_slug}/`}>{m.province_name}</a><span>/</span><b>Gemeente {m.name}</b></nav>
      <h1>{cap(v.name_singular)} in gemeente {m.name}</h1>
      <p className="lede" style={{ marginTop: 8 }}>
        {businesses.length} {businesses.length === 1 ? v.name_singular : v.name_plural} in de gemeente {m.name}, waarvan {verified} geverifieerd.
        {emergency > 0 ? ` ${emergency} ${emergency === 1 ? "doet" : "doen"} spoedreparaties.` : ""}
        {content?.intro ? "" : ` Kies een plaats hieronder voor bedrijven binnen 30 kilometer.`}
      </p>
      {content?.intro && <p className="lede" style={{ marginTop: 12 }}>{content.intro}</p>}

      <div className="layout">
        <div className="main">
          <details className="sorteer"><summary>Zo sorteren we deze lijst</summary><p>Geverifieerde profielen staan boven niet-geclaimde bedrijven; daarbinnen sorteren we op reviewscore en daarna op afstand. Een hogere plek betekent dat het bedrijf gecontroleerd is, niet dat het beter werk levert.</p></details>
          {businesses.length === 0 && <div className="card">Nog geen {v.name_plural} bekend in deze gemeente. Kies een plaats voor bedrijven in de omgeving.</div>}
          {businesses.map((b) => <BusinessCard key={b.id} b={b} v={v} placeContext={`gemeente ${m.name}`} />)}
        </div>
        <aside className="aside">
          <div className="map-card">
            <Map center={[m.lat, m.lng]} zoom={11} cluster markers={businesses.filter((b) => b.lat && b.lng).map((b) => ({ lat: b.lat!, lng: b.lng!, label: b.name, href: businessPath(b), pro: b.status === "pro" }))} />
            <div className="map-foot"><span>{businesses.length} in de gemeente</span></div>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>Plaatsen in {m.name}</h2>
            <div className="chips">
              {places.map((p) => (
                <a key={p.id} href={placePath(p)} className="pill" rel={p.business_count >= 3 ? undefined : "nofollow"}>{p.name} ({p.business_count})</a>
              ))}
            </div>
          </div>
          <div className="cta-navy">
            <h2 style={{ fontSize: 17 }}>{cap(v.name_singular)} in {m.name}?</h2>
            <p>Claim je profiel gratis. Met Pro sta je bovenaan en ontvang je offerteaanvragen.</p>
            <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
          </div>
        </aside>
      </div>

      <section className="faq" style={{ paddingTop: 8, paddingBottom: 48, maxWidth: 760 }}>
        <h2 style={{ marginBottom: 12 }}>Veelgestelde vragen over {v.name_plural} in {m.name}</h2>
        {faq.map((f, i) => (
          <details key={i} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>
        ))}
      </section>
    </main>
  );
}
