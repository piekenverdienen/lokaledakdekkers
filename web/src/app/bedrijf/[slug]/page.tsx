import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Map from "@/components/Map";
import { initials } from "@/components/BusinessCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getBusiness, getBusinessesNear, getReviews } from "@/lib/db";
import { baseUrl, breadcrumbSchema, businessPath, businessSchema, currentVertical, cap, formatPhone, serviceName, telHref, waHref } from "@/lib/site";

export const revalidate = 86400;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ eigenaar?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const v = await currentVertical();
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") return {};
  const claimed = b.status !== "unclaimed";
  return {
    title: `${b.name}, ${v.name_singular} in ${b.city ?? b.place_name ?? "Nederland"}`,
    description: claimed && b.description ? b.description.slice(0, 155) : `${b.name} is ${v.name_singular} in ${b.city ?? "Nederland"}. Contactgegevens, reviews en werkgebied op ${v.brand}.`,
    alternates: { canonical: businessPath(b) },
  };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { eigenaar } = await searchParams;
  const v = await currentVertical();
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") notFound();
  const claimed = b.status !== "unclaimed";
  const pro = b.status === "pro";
  const [reviews, others] = await Promise.all([getReviews(b.id), b.lat && b.lng ? getBusinessesNear(b.lat, b.lng, v.id, 30, 6) : Promise.resolve([])]);
  const nearby = others.filter((o) => o.id !== b.id).slice(0, 5);
  const base = baseUrl(v);
  const schema = [
    businessSchema(v, b, base),
    breadcrumbSchema([
      { name: "Nederland", url: `${base}/` },
      ...(b.province_slug && b.municipality_slug && b.place_slug && b.place_name ? [{ name: b.place_name, url: `${base}/${b.province_slug}/${b.municipality_slug}/${b.place_slug}/` }] : []),
      { name: b.name, url: `${base}${businessPath(b)}` },
    ]),
  ];
  const tel = telHref(b.phone);
  const wa = pro ? waHref(b.whatsapp ?? b.phone, v.brand) : null;

  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="crumbs" aria-label="Kruimelpad">
        <a href="/">Nederland</a>
        {b.place_slug && b.place_name && (<><span>/</span><a href={`/${b.province_slug}/${b.municipality_slug}/${b.place_slug}/`}>{b.place_name}</a></>)}
        <span>/</span><b>{b.name}</b>
      </nav>

      {eigenaar && !claimed && (
        <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginTop: 8, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div><b>Dit zien bezoekers over jouw bedrijf. Kloppen deze gegevens?</b><br /><span style={{ color: "var(--ink-2)" }}>Claim je profiel om het aan te vullen met logo, foto's en diensten. Verificatie via je website en e-mail, daarna 79,95 per jaar inclusief btw.</span></div>
          <a href={`/claim/${b.slug}/`} className="btn btn-primary">Ja, dit is mijn bedrijf</a>
        </div>
      )}
      <div className="layout" style={{ paddingTop: 8 }}>
        <div className="main">
          <article className={`biz${pro ? " pro" : ""}`} style={{ padding: 26 }}>
            <div className="biz-head">
              <div className={`logo${pro ? " pro" : ""}`} style={{ width: 72, height: 72, fontSize: 24 }}>{b.logo_url ? <img src={b.logo_url} alt="" /> : initials(b.name)}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
                <div className="biz-title">
                  <h1 style={{ fontSize: 28 }}>{b.name}</h1>
                  {pro && <span className="badge">Aanbevolen</span>}
                  {claimed && <VerifiedBadge verifiedAt={b.verified_at} kvkCheckedAt={b.kvk_checked_at} paidUntil={b.paid_until} />}
                </div>
                <div className="meta">
                  <span>{cap(v.name_singular)} in {b.city ?? b.place_name ?? "Nederland"}</span>
                  {b.kvk_number && <span>KvK {b.kvk_number}</span>}
                  {b.kvk_started && <span>Ingeschreven sinds {b.kvk_started.slice(0, 4)}</span>}
                  {b.avg_score != null && <span><b>{String(b.avg_score).replace(".", ",")}</b> uit {b.review_count} reviews</span>}
                  {b.emergency && <span className="spoed">Spoed bij lekkage</span>}
                </div>
              </div>
            </div>

            {claimed && b.description ? (
              <p style={{ color: "var(--ink-2)", fontSize: 17 }}>{b.description}</p>
            ) : (
              <div className="card" style={{ background: "var(--ground)", borderStyle: "dashed" }}>
                <p style={{ color: "var(--ink-2)" }}>Dit profiel is nog niet geclaimd door het bedrijf. De gegevens komen uit het KvK Handelsregister. Ben jij de eigenaar? Claim het profiel gratis en vul het aan met diensten, foto's en werkgebied.</p>
                <a href={`/claim/${b.slug}/`} className="btn btn-outline" style={{ marginTop: 12 }}>Dit is mijn bedrijf</a>
              </div>
            )}

            {b.services.length > 0 && (
              <div><h3 style={{ marginBottom: 8 }}>Diensten</h3><div className="chips">{b.services.map((s) => <span key={s} className="chip">{serviceName(v, s)}</span>)}</div></div>
            )}
            {b.certifications.length > 0 && (
              <div><h3 style={{ marginBottom: 8 }}>Keurmerken</h3><div className="chips">{b.certifications.map((c) => <span key={c} className="chip">{c}</span>)}</div></div>
            )}
            {b.usps.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-2)" }}>{b.usps.map((u) => <li key={u}>{u}</li>)}</ul>
            )}

            <div className="actions">
              {tel && <a href={tel} className="btn btn-primary">{formatPhone(b.phone)}</a>}
              {wa && <a href={wa} className="btn btn-green" rel="noopener">WhatsApp</a>}
              {pro && <a href={`/offerte/?bedrijf=${b.slug}`} className="btn btn-outline">Vraag een offerte</a>}
              {claimed && b.website && <a href={b.website} className="btn btn-ghost" rel="nofollow noopener" target="_blank">Website</a>}
            </div>
          </article>

          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 style={{ fontSize: 20 }}>Reviews{b.review_count > 0 ? ` (${b.review_count})` : ""}</h2>
            {reviews.length === 0 && <p style={{ color: "var(--ink-2)" }}>Nog geen reviews. Heb je werk laten doen door {b.name}? Deel je ervaring, met factuur als bewijs krijgt je review het label Geverifieerde klus.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="meta"><span className="stars" aria-label={`${r.score} van 5`}>{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span><b>{r.name}</b>{r.invoice_verified && <span className="verified">Geverifieerde klus</span>}{r.service_slug && <span>{serviceName(v, r.service_slug)}</span>}</div>
                <p style={{ color: "var(--ink-2)" }}>{r.body}</p>
              </div>
            ))}
            <a href={`/review/${b.slug}/`} className="btn btn-outline" style={{ alignSelf: "flex-start", marginTop: 8 }}>Schrijf een review</a>
          </section>
        </div>

        <aside className="aside">
          {b.lat && b.lng && (
            <div className="map-card">
              <Map center={[b.lat, b.lng]} zoom={12} fit={false} markers={[{ lat: b.lat, lng: b.lng, label: b.name, pro }]} />
              <div className="map-foot"><span>{b.street ? `${b.street} ${b.housenumber ?? ""}, ${b.postcode ?? ""} ${b.city ?? ""}` : `${b.postcode ?? ""} ${b.city ?? ""}`}</span></div>
            </div>
          )}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ fontSize: 17 }}>Zo controleer je dit bedrijf</h2>
            <p style={{ color: "var(--ink-2)", fontSize: 15 }}>
              {claimed ? "Dit bedrijf heeft zijn profiel geverifieerd via het websitedomein en de KvK-inschrijving." : "Dit profiel is niet geverifieerd. Controleer het KvK-nummer zelf op kvk.nl voordat je een opdracht geeft."} Betaal nooit een voorschot aan een {v.name_singular} die ongevraagd aan de deur komt, en vraag altijd een schriftelijke offerte.
            </p>
            <a href={`/betrouwbare-${v.name_singular}/`} style={{ fontWeight: 600, fontSize: 15 }}>Meer tips voor een betrouwbare {v.name_singular}</a>
            <a href={`/corrigeren/${b.slug}/`} style={{ fontSize: 14, color: "var(--ink-3)" }}>Kloppen deze gegevens niet? Geef een correctie door (gratis)</a>
          </div>
          {nearby.length > 0 && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ fontSize: 17 }}>Andere {v.name_plural} in de buurt</h2>
              {nearby.map((o) => <a key={o.id} href={businessPath(o)} style={{ fontSize: 15 }}>{o.name}{o.city ? `, ${o.city}` : ""}</a>)}
            </div>
          )}
        </aside>
      </div>
      {tel && <div className="sticky-call"><a href={tel} className="btn btn-primary">Bel {b.name}</a></div>}
    </main>
  );
}
