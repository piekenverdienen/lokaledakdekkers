import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Map from "@/components/Map";
import { getMunicipalities, getProvince } from "@/lib/db";
import { baseUrl, breadcrumbSchema, currentVertical, cap } from "@/lib/site";

export const revalidate = 86400;
type Props = { params: Promise<{ provincie: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincie } = await params;
  const v = await currentVertical();
  const p = await getProvince(provincie);
  if (!p) return {};
  return {
    title: `${cap(v.name_plural)} in ${p.name}: alle gemeenten`,
    description: `Overzicht van ${v.name_plural} in ${p.name} per gemeente, met geverifieerde bedrijven en reviews met factuurbewijs.`,
    alternates: { canonical: `/${p.slug}/` },
  };
}

export default async function ProvincePage({ params }: Props) {
  const { provincie } = await params;
  const v = await currentVertical();
  const p = await getProvince(provincie);
  if (!p) notFound();
  const munis = await getMunicipalities(p.id, v.id);
  const total = munis.reduce((a, m) => a + m.business_count, 0);
  const base = baseUrl(v);
  const crumbs = breadcrumbSchema([{ name: "Nederland", url: `${base}/` }, { name: p.name, url: `${base}/${p.slug}/` }]);

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <nav className="crumbs" aria-label="Kruimelpad"><a href="/">Nederland</a><span>/</span><b>{p.name}</b></nav>
      <h1>{cap(v.name_plural)} in {p.name}</h1>
      <p className="lede" style={{ marginTop: 8 }}>{total > 0 ? `${total} ${v.name_plural} in ${munis.length} gemeenten.` : `${munis.length} gemeenten.`} Kies een gemeente voor de bedrijven, plaatsen en richtprijzen.</p>
      <div className="layout">
        <div className="main">
          <div className="grid cols-3">
            {munis.map((m) => (
              <a key={m.id} href={`/${p.slug}/${m.slug}/`} className="card card-link">
                <b>{m.name}</b>
                <small>{m.business_count > 0 ? `${m.business_count} ${m.business_count === 1 ? v.name_singular : v.name_plural}` : "nog geen bedrijven"}</small>
              </a>
            ))}
          </div>
        </div>
        <aside className="aside">
          <div className="map-card">
            <Map center={[p.lat, p.lng]} zoom={9} tall markers={munis.filter((m) => m.business_count > 0).map((m) => ({
              lat: m.lat, lng: m.lng, label: `${m.name} (${m.business_count})`, href: `/${p.slug}/${m.slug}/`, size: Math.max(5, Math.min(14, 4 + Math.sqrt(m.business_count) * 1.6)),
            }))} />
            <div className="map-foot"><span>{v.name_plural} per gemeente</span></div>
          </div>
          <div className="cta-navy">
            <h2 style={{ fontSize: 17 }}>{cap(v.name_singular)} in {p.name}?</h2>
            <p>Claim je profiel gratis. Met Pro sta je bovenaan in je werkgebied en ontvang je offerteaanvragen.</p>
            <a href="/claim/" className="btn btn-amber">Claim je profiel</a>
          </div>
        </aside>
      </div>
    </main>
  );
}
