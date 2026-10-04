import { headers } from "next/headers";
import { getVertical, type Business, type Vertical } from "./db";

export async function currentVertical(): Promise<Vertical> {
  const h = await headers();
  return getVertical(h.get("x-forwarded-host") ?? h.get("host") ?? "");
}

export function baseUrl(v: Vertical) {
  return process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
}

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatPhone(p: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("06")) return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  if (d.length === 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
  return p;
}

export function telHref(p: string | null) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  return `tel:+31${d.replace(/^0/, "")}`;
}

export function waHref(p: string | null, brand: string) {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (!d.startsWith("06")) return null;
  return `https://wa.me/31${d.slice(1)}?text=${encodeURIComponent(`Hallo, ik vond u via ${brand}.`)}`;
}

export function serviceName(v: Vertical, slug: string) {
  return v.services.find((s) => s.slug === slug)?.name ?? slug;
}

export function businessPath(b: Business) {
  return `/bedrijf/${b.slug}/`;
}
export function placePath(p: { province_slug: string; municipality_slug: string; slug: string }) {
  return `/${p.province_slug}/${p.municipality_slug}/${p.slug}/`;
}

export function businessSchema(v: Vertical, b: Business, base: string) {
  const s: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": v.schema_type,
    name: b.name,
    url: `${base}${businessPath(b)}`,
    telephone: b.phone ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: b.street ? `${b.street} ${b.housenumber ?? ""}`.trim() : undefined,
      postalCode: b.postcode ?? undefined,
      addressLocality: b.city ?? undefined,
      addressCountry: "NL",
    },
    geo: b.lat && b.lng ? { "@type": "GeoCoordinates", latitude: b.lat, longitude: b.lng } : undefined,
    image: b.logo_url ?? undefined,
    sameAs: b.website ?? undefined,
  };
  if (b.review_count >= 3 && b.avg_score) {
    s.aggregateRating = { "@type": "AggregateRating", ratingValue: b.avg_score, reviewCount: b.review_count, bestRating: 5, worstRating: 1 };
  }
  return s;
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function faqSchema(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

// FAQ uit de echte data, zonder AI, als er nog geen page_content is
export function dataFaq(v: Vertical, placeName: string, stats: { business_count: number; verified_count: number; avg_score: number | null; review_count: number }, emergencyCount: number) {
  const faq: { q: string; a: string }[] = [];
  faq.push({
    q: `Hoeveel ${v.name_plural} zijn er in ${placeName}?`,
    a: `In en rond ${placeName} (binnen 30 kilometer) staan ${stats.business_count} ${v.name_plural} in de gids, waarvan ${stats.verified_count} geverifieerd op KvK-inschrijving en websitedomein.`,
  });
  if (emergencyCount > 0) {
    faq.push({
      q: `Welke ${v.name_singular} in ${placeName} helpt bij spoed?`,
      a: `${emergencyCount} van de ${stats.business_count} ${v.name_plural} rond ${placeName} doen spoedreparaties. Gebruik het filter Spoed bovenaan de lijst.`,
    });
  }
  if (stats.review_count >= 3 && stats.avg_score) {
    faq.push({
      q: `Hoe worden ${v.name_plural} in ${placeName} beoordeeld?`,
      a: `De ${v.name_plural} rond ${placeName} scoren gemiddeld ${String(stats.avg_score).replace(".", ",")} uit 5 op basis van ${stats.review_count} reviews. Reviews met het label Geverifieerde klus zijn gekoppeld aan een factuur.`,
    });
  }
  faq.push({
    q: `Hoe herken ik een betrouwbare ${v.name_singular} in ${placeName}?`,
    a: `Kies een bedrijf met het label Geverifieerd, controleer het KvK-nummer en de startdatum op het profiel, vraag een schriftelijke offerte en betaal nooit een voorschot aan een ${v.name_singular} die aan de deur komt.`,
  });
  return faq;
}

export function websiteDomainSafe(url: string | null) {
  if (!url) return "";
  try { return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, ""); } catch { return url; }
}
