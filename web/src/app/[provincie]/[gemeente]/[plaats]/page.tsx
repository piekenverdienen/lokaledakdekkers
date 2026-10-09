import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Map from "@/components/Map";
import PlaceCookie from "@/components/PlaceCookie";
import BusinessCard from "@/components/BusinessCard";
import { getBusinessesNear, getNearbyIndexablePlaces, getPageContent, getPlace, one } from "@/lib/db";
import { marked } from "marked";
import { baseUrl, breadcrumbSchema, businessPath, currentVertical, cap, dataFaq, faqSchema } from "@/lib/site";

export const revalidate = 86400;
const MIN_INDEX = 3;
type Props = { params: Promise<{ provincie: string; gemeente: string; plaats: string }>; searchParams: Promise<{ filter?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincie, gemeente, plaats } = await params;
  const v = await currentVertical();
  const p = await getPlace(provincie, gemeente, plaats, v.id);
  if (!p) return {};
  const indexable = p.business_count >= MIN_INDEX;
  const local = (await one<{ n: number }>("select count(*)::int as n from businesses b join places p on p.id=$1 where b.vertical_id=$2 and b.status<>'hidden' and b.source<>'test' and b.geom is not null and st_dwithin(b.geom::geography, p.geom::geography, 4000)", [p.id, v.id]))?.n ?? 0;
  const n = local || p.business_count;
  return {
    title: `${cap(v.name_singular)} in ${p.name}: ${n} ${n === 1 ? v.name_singular : v.name_plural} vergelijken (2026)`,
    description: `${n} ${v.name_plural} in ${p.name}${p.verified_count ? `, waarvan ${p.verified_count} met gecontroleerde bedrijfsgegevens` : ""}. Bekijk hun diensten en werk, vergelijk richtprijzen en vraag rechtstreeks een offerte aan.`,
    alternates: { canonical: indexable ? `/${p.province_slug}/${p.municipality_slug}/${p.slug}/` : `/${p.province_slug}/${p.municipality_slug}/` },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function PlacePage({ params, searchParams }: Props) {
  const { provincie, gemeente, plaats } = await params;
  const { filter } = await searchParams;
  const v = await currentVertical();
  const p = await getPlace(provincie, gemeente, plaats, v.id);
  if (!p) notFound();
  const [all, nearby, content] = await Promise.all([
    getBusinessesNear(p.lat, p.lng, v.id, 30), getNearbyIndexablePlaces(p.lat, p.lng, v.id, p.id), getPageContent(v.id, p.id, null),
  ]);
  const businesses = filter === "spoed" ? all.filter((b) => b.emergency) : filter === "score" ? [...all].sort((a, b) => Number(b.avg_score ?? 0) - Number(a.avg_score ?? 0)) : all;
  const local = all.filter((b) => (b.distance_km ?? 99) <= 5).length;
  const emergency = all.filter((b) => b.emergency).length;
  const pros = all.filter((b) => b.status === "pro").length;
  const faq = content?.faq?.length ? content.faq : dataFaq(v, p.name, p, emergency);
  const base = baseUrl(v);
  const here = `/${p.province_slug}/${p.municipality_slug}/${p.slug}/`;
  const schema = [
    breadcrumbSchema([{ name: "Nederland", url: `${base}/` }, { name: p.province_name, url: `${base}/${p.province_slug}/` }, { name: `Gemeente ${p.municipality_name}`, url: `${base}/${p.province_slug}/${p.municipality_slug}/` }, { name: p.name, url: `${base}${here}` }]),
    faqSchema(faq),
    { "@context": "https://schema.org", "@type": "ItemList", itemListElement: all.slice(0, 20).map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}${businessPath(b)}`, name: b.name })) },
  ];
  const first = businesses.find((b) => b.phone);

  return (
    <main className="wrap">
      <PlaceCookie name={p.name} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="crumbs" aria-label="Kruimelpad">
        <a href="/">Nederland</a><span>/</span><a href={`/${p.province_slug}/`}>{p.province_name}</a><span>/</span>
        <a href={`/${p.province_slug}/${p.municipality_slug}/`}>Gemeente {p.municipality_name}</a><span>/</span><b>{p.name}</b>
      </nav>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1>{cap(v.name_singular)} in {p.name}</h1>
          <p className="lede">
            {local} {local === 1 ? v.name_singular : v.name_plural} in {p.name} en {all.length - local} binnen 30 km, waarvan {p.verified_count} geverifieerd.
            {p.review_count >= 3 && p.avg_score ? ` Gemiddelde score ${String(p.avg_score).replace(".", ",")} uit ${p.review_count} reviews.` : ""}
            {emergency > 0 ? ` ${emergency} ${emergency === 1 ? "doet" : "doen"} spoedreparaties.` : ""}
          </p>
        </div>
        <div className="chips">
          <a href={here} className={`pill${!filter ? " on" : ""}`}>Alle</a>
          <a href={`${here}?filter=spoed`} className={`pill${filter === "spoed" ? " on" : ""}`} rel="nofollow">Spoed</a>
          <a href={`${here}?filter=score`} className={`pill${filter === "score" ? " on" : ""}`} rel="nofollow">Hoogste score</a>
        </div>
      </div>
      {content?.intro && <p className="lede" style={{ marginTop: 14 }}>{content.intro}</p>}

      <div className="layout">
        <div className="main">
          {pros > 0 && (
            <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <b style={{ fontFamily: "Manrope, sans-serif", fontSize: 18 }}>Vergelijk {Math.min(3, pros)} offertes van geverifieerde {v.name_plural}</b>
                <span style={{ color: "var(--ink-2)", fontSize: 15 }}>Eén aanvraag, maximaal 3 bedrijven, je ziet vooraf welke. Geen doorverkoop van je gegevens.</span>
              </div>
              <a href={`/offerte/${p.slug}/`} className="btn btn-primary" style={{ fontWeight: 700 }}>Vraag {Math.min(3, pros)} offertes aan</a>
            </div>
          )}
          <details className="sorteer"><summary>Zo sorteren we deze lijst</summary><p>Geverifieerde profielen staan boven niet-geclaimde bedrijven; daarbinnen sorteren we op reviewscore en daarna op afstand. Een hogere plek betekent dat het bedrijf gecontroleerd is, niet dat het beter werk levert.</p></details>
          {businesses.length === 0 && <div className="card">Geen {v.name_plural} gevonden met dit filter.</div>}
          {businesses.map((b) => <BusinessCard key={b.id} b={b} v={v} placeContext={`${p.name} en omgeving`} />)}
        </div>
        <aside className="aside">
          <div className="map-card">
            <Map center={[p.lat, p.lng]} zoom={10} cluster markers={all.filter((b) => b.lat && b.lng).map((b) => ({ lat: b.lat!, lng: b.lng!, label: b.name, href: businessPath(b), pro: b.status === "pro" }))} />
            <div className="map-foot"><span>{local} in {p.name}, {all.length - local} binnen 30 km</span></div>
          </div>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h2 style={{ fontSize: 17 }}>Wat kost dakwerk?</h2>
            <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Richtprijzen 2026 voor een nieuw dak, plat dak, dakkapel, isolatie en reparaties.</p>
            <a href="/kennis/wat-kost-een-dakdekker/" style={{ fontWeight: 600, fontSize: 15 }}>Bekijk de richtprijzen</a>
          </div>
          <div className="cta-navy">
            <h2 style={{ fontSize: 17 }}>{cap(v.name_singular)} in {p.name}?</h2>
            <p>Ben je {v.name_singular} in {p.name}? Claim je pagina: geclaimde profielen staan hier bovenaan en ontvangen offerteaanvragen rechtstreeks.</p>
            <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
          </div>
        </aside>
      </div>

      {content?.body && (
        <section className="prose" style={{ maxWidth: 840, paddingTop: 8, paddingBottom: 16 }} dangerouslySetInnerHTML={{ __html: marked.parse(content.body) as string }} />
      )}

      <section style={{ display: "flex", flexWrap: "wrap", gap: 48, paddingTop: 8, paddingBottom: 48 }}>
        <div className="faq" style={{ flex: "2 1 480px", minWidth: 0 }}>
          <h2 style={{ marginBottom: 12 }}>Veelgestelde vragen over {v.name_plural} in {p.name}</h2>
          {faq.map((f, i) => <details key={i} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </div>
        <div style={{ flex: "1 1 260px", minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ fontSize: 17 }}>{cap(v.name_plural)} in de buurt</h2>
          <div className="chips">
            {nearby.map((n) => <a key={n.slug + n.municipality_slug} href={`/${n.province_slug}/${n.municipality_slug}/${n.slug}/`} className="pill">{n.name} ({n.business_count})</a>)}
          </div>
          <h2 style={{ fontSize: 17, marginTop: 8 }}>Meer in {p.province_name}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 15 }}>
            <a href={`/${p.province_slug}/${p.municipality_slug}/`}>Alle {v.name_plural} in gemeente {p.municipality_name}</a>
            <a href={`/${p.province_slug}/`}>Alle gemeenten in {p.province_name}</a>
            <a href={`/betrouwbare-${v.name_singular}/`}>Zo herken je een betrouwbare {v.name_singular}</a>
            <a href="/kennis/">Kennisbank: kosten, dakbedekking, lekkage</a>
          </div>
        </div>
      </section>

      {first && first.phone && (
        <div className="sticky-call">
          <a href={`tel:+31${first.phone.replace(/\D/g, "").replace(/^0/, "")}`} className="btn btn-primary">Bel {first.name}</a>
          {pros > 0 && <a href={`/offerte/${p.slug}/`} className="btn btn-outline">Offertes</a>}
        </div>
      )}
    </main>
  );
}
