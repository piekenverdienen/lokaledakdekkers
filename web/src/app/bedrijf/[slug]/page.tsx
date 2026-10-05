import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Map from "@/components/Map";
import { initials } from "@/components/BusinessCard";
import VerifiedBadge from "@/components/VerifiedBadge";
import { getUser } from "@/lib/auth";
import QuoteForm from "@/components/QuoteForm";
import { getBusiness, getBusinessesNear, getReviews, one, q } from "@/lib/db";
import { baseUrl, breadcrumbSchema, businessPath, businessSchema, currentVertical, cap, formatPhone, serviceName, telHref, waHref } from "@/lib/site";

export const revalidate = 86400;
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ eigenaar?: string; review?: string; offerte?: string; o?: string }> };

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
    robots: b.source === "test" || b.status === "unclaimed" ? { index: false, follow: true } : undefined,
    openGraph: { title: `${b.name}, ${v.name_singular} in ${b.city ?? "Nederland"}`, type: "profile", images: [{ url: `/og/${b.slug}/`, width: 1200, height: 630, alt: `${b.name} op ${v.brand}` }] },
  };
}

export default async function BusinessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { eigenaar, review, offerte, o } = await searchParams;
  if (o) await q("update outreach set clicked_at=coalesce(clicked_at, now()) where token=$1", [o]).catch(() => {});
  const v = await currentVertical();
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") notFound();
  const viewer = await getUser().catch(() => null);
  const ownerPreview = b.status === "unclaimed" && !!viewer && ((b as unknown as { owner_user_id?: string | null }).owner_user_id === viewer.id || viewer.is_admin);
  const claimed = b.status !== "unclaimed" || ownerPreview;
  const built = !claimed && !!b.profile_built_at; // vooraf gebouwd: tekst, logo, diensten en werkgebied publiek, foto's en contact na claim
  const photoCount = built ? ((await one<{ n: number }>("select count(*)::int as n from business_photos where business_id=$1", [b.id]))?.n ?? 0) : 0;
  const canQuote = (claimed && !!b.email) || (built && !!b.outreach_email);
  const photos = claimed ? await q<{ id: string; url: string }>("select id, url from business_photos where business_id=$1 order by sort_order limit 30", [b.id]) : [];
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

      {ownerPreview && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginTop: 8, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}><div><b>Voorbeeld: zo ziet je profiel eruit zodra het online staat.</b><br /><span style={{ color: "var(--ink-2)" }}>Bezoekers zien nu nog de basisvermelding. Na betaling wordt dit de publieke pagina.</span></div><a href={`/dashboard/${b.slug}/`} className="btn btn-primary">Terug naar het dashboard</a></div>}
      {review === "bevestigd" && <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)", marginTop: 8 }}><b>Bedankt, je review is bevestigd.</b> We plaatsen hem binnen een werkdag.</div>}
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

            {(claimed || built) && b.description && <p style={{ color: "var(--ink-2)", fontSize: 17 }}>{b.description}</p>}
            {!claimed && (
              <div className="card" style={{ background: "var(--ground)", borderStyle: "dashed", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <p style={{ color: "var(--ink-2)", margin: 0 }}>{built ? "Dit bedrijf heeft zijn pagina nog niet bevestigd." : "Dit bedrijf heeft zijn pagina nog niet bevestigd; de gegevens komen uit het KvK Handelsregister."} Ben jij de eigenaar? <b>Claim je pagina</b> en maak hem persoonlijk{photoCount ? `, inclusief je ${photoCount} foto's` : ""}.</p>
                <a href={`/claim/${b.slug}/`} className="btn btn-outline">Dit is mijn bedrijf</a>
              </div>
            )}

            {(claimed || built) && b.services.length > 0 && (
              <div><h3 style={{ marginBottom: 8 }}>Diensten</h3><div className="chips">{b.services.map((s) => <span key={s} className="chip">{serviceName(v, s)}</span>)}</div></div>
            )}
            {(claimed || built) && b.certifications.length > 0 && (
              <div><h3 style={{ marginBottom: 8 }}>Keurmerken</h3><div className="chips">{b.certifications.map((c) => <span key={c} className="chip">{c}</span>)}</div></div>
            )}
            {(claimed || built) && b.usps.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 20, color: "var(--ink-2)" }}>{b.usps.map((u) => <li key={u}>{u}</li>)}</ul>
            )}

            <div className="actions">
              {claimed && tel && <a href={tel} className="btn btn-primary">{formatPhone(b.phone)}</a>}
              {claimed && wa && <a href={wa} className="btn btn-green" rel="noopener">WhatsApp</a>}
              {canQuote && b.availability !== "full" && <a href="#offerte" className="btn btn-amber">Vraag een offerte aan</a>}
              {claimed && b.availability === "full" && <span className="badge">Momenteel vol{b.available_from ? `, weer beschikbaar vanaf ${b.available_from}` : ""}</span>}
              {claimed && b.availability === "from" && b.available_from && <span className="badge">Beschikbaar vanaf {b.available_from}</span>}
              {claimed && b.website && <a href={b.website} className="btn btn-ghost" rel="nofollow noopener" target="_blank">Website</a>}
            </div>
          </article>

          {photos.length > 0 && (
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 20 }}>Foto's van het werk</h2>
              <div className="photos" style={{ gridTemplateColumns: photos.length === 1 ? "minmax(0, 480px)" : "repeat(auto-fill, minmax(160px, 1fr))" }}>
                {photos.map((p) => <a key={p.id} href={p.url} target="_blank" rel="noopener"><img src={p.url} alt={`Werk van ${b.name}`} loading="lazy" /></a>)}
              </div>
            </section>
          )}

          {built && photoCount > 0 && (
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ fontSize: 20 }}>Foto's van het werk</h2>
              <div className="photos">{Array.from({ length: Math.min(photoCount, 4) }).map((_, i) => <div key={i} style={{ aspectRatio: "4 / 3", borderRadius: 10, background: "linear-gradient(135deg, #C2D1DB, #E3EAF0)" }} />)}</div>
              <p style={{ color: "var(--ink-2)", fontSize: 15, margin: 0 }}>{photoCount} foto's worden zichtbaar zodra het bedrijf zijn pagina heeft bevestigd.</p>
            </section>
          )}

          {canQuote && b.availability !== "full" && (
            <>
              {offerte === "fout" && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)" }}>Er ontbreekt nog iets in je aanvraag: vul alle velden in en schrijf minimaal 30 tekens in de omschrijving.</div>}
              {offerte === "limiet" && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)" }}>Je hebt het maximum van drie aanvragen per uur bereikt.</div>}
              <QuoteForm v={v} slug={b.slug} name={b.name} status={offerte} />
            </>
          )}

          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 style={{ fontSize: 20 }}>Reviews{b.review_count > 0 ? ` (${b.review_count})` : ""}</h2>
            {reviews.length === 0 && <p style={{ color: "var(--ink-2)" }}>Nog geen reviews. Heb je werk laten doen door {b.name}? Deel je ervaring, met factuur als bewijs krijgt je review het label Geverifieerde klus.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="meta"><span className="stars" aria-label={`${r.score} van 5`}>{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span><b>{r.name}</b>{r.invoice_verified && <span className="verified">Geverifieerde klus</span>}{r.service_slug && <span>{serviceName(v, r.service_slug)}</span>}</div>
                <p style={{ color: "var(--ink-2)" }}>{r.body}</p>
                {r.reply && <div style={{ borderLeft: "3px solid var(--amber)", paddingLeft: 12, marginTop: 6 }}><small style={{ color: "var(--ink-3)" }}>Reactie van {b.name}</small><p style={{ color: "var(--ink-2)", margin: "2px 0 0", fontSize: 15 }}>{r.reply}</p></div>}
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
              {claimed ? "Dit bedrijf heeft zijn profiel geverifieerd via het websitedomein en de KvK-inschrijving." : "Dit bedrijf heeft zijn pagina nog niet bevestigd. Controleer het KvK-nummer zelf op kvk.nl voordat je een opdracht geeft."} Betaal nooit een voorschot aan een {v.name_singular} die ongevraagd aan de deur komt, en vraag altijd een schriftelijke offerte.
            </p>
            <a href={`/betrouwbare-${v.name_singular}/`} style={{ fontWeight: 600, fontSize: 15 }}>Meer tips voor een betrouwbare {v.name_singular}</a>
            <a href={`/corrigeren/${b.slug}/`} style={{ fontSize: 14, color: "var(--ink-3)" }}>Kloppen deze gegevens niet? Geef een correctie door (gratis)</a>
          </div>
          {!claimed && nearby.length > 0 && (
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
