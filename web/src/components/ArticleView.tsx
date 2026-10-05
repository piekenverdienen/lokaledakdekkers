import Illustration from "@/components/Illustration";
import type { Article } from "@/lib/kennis";
import type { Vertical } from "@/lib/db";
import { faqSchema, breadcrumbSchema } from "@/lib/site";

export function ArticleCard({ a }: { a: Article }) {
  return (
    <a href={`/kennis/${a.slug}/`} className="card card-link art-card">
      <div className="art-thumb"><Illustration kind={a.illustration} /></div>
      <small style={{ color: "var(--blue)", fontWeight: 600 }}>{a.category}</small>
      <b>{a.title}</b>
      <small>{a.readMinutes} min lezen</small>
    </a>
  );
}

export default function ArticleView({ a, v, base, canonical, related }: { a: Article; v: Vertical; base: string; canonical: string; related: Article[] }) {
  const schema = [
    {
      "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.description,
      datePublished: a.date, dateModified: a.updated, inLanguage: "nl-NL",
      author: { "@type": "Organization", name: v.brand, url: base }, publisher: { "@type": "Organization", name: v.brand, url: base },
      mainEntityOfPage: `${base}${canonical}`, keywords: a.keywords.join(", "),
    },
    a.faq.length ? faqSchema(a.faq) : null,
    breadcrumbSchema([{ name: "Nederland", url: `${base}/` }, { name: "Kennis", url: `${base}/kennis/` }, { name: a.title, url: `${base}${canonical}` }]),
  ].filter(Boolean);
  return (
    <main className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav className="crumbs" aria-label="Kruimelpad"><a href="/">Nederland</a><span>/</span><a href="/kennis/">Kennis</a><span>/</span><b>{a.category}</b></nav>
      <div className="layout" style={{ paddingTop: 0 }}>
        <article className="main prose" style={{ maxWidth: 760 }}>
          <span className="eyebrow">{a.category}</span>
          <h1>{a.title}</h1>
          <p className="lede">{a.description}</p>
          <div className="meta"><span>Bijgewerkt {new Date(a.updated).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span><span>{a.readMinutes} min lezen</span><span>Richtprijzen 2026, bronnen onderaan</span></div>
          <div style={{ margin: "8px 0 4px" }}><Illustration kind={a.illustration} /></div>
          {a.toc.length > 2 && (
            <nav className="toc" aria-label="Inhoud"><b>In dit artikel</b><ol>{a.toc.map((t) => <li key={t.id}><a href={`#${t.id}`}>{t.text}</a></li>)}</ol></nav>
          )}
          <div dangerouslySetInnerHTML={{ __html: a.html }} />
          {a.faq.length > 0 && (
            <section className="faq"><h2 id="veelgestelde-vragen">Veelgestelde vragen</h2>{a.faq.map((f, i) => <details key={i} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}</section>
          )}
          <p className="srnote" style={{ marginTop: 24 }}>Bronnen: richtprijzen samengesteld uit Nederlandse prijsgidsen en offerteplatforms (2026) en de subsidieregels van RVO. Prijzen zijn indicaties inclusief btw tenzij anders vermeld en verschillen per regio, dak en bedrijf. Zodra {v.brand} per provincie minimaal vijf facturen van geverifieerde klussen heeft, vervangen echte regionale cijfers deze indicaties.</p>
        </article>
        <aside className="aside">
          <div className="cta-navy">
            <h2 style={{ fontSize: 17 }}>Een {v.name_singular} in de buurt?</h2>
            <p>Vergelijk geverifieerde {v.name_plural} in jouw plaats en vraag in één keer 3 offertes aan.</p>
            <form action="/zoeken/" method="get" style={{ display: "flex", gap: 8 }}><input name="q" placeholder="Jouw plaats" aria-label="Plaats" style={{ flex: 1, minWidth: 0, border: 0, borderRadius: 10, padding: "0 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit" }} /><button className="btn btn-amber" type="submit">Zoek</button></form>
          </div>
          {related.length > 0 && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 17 }}>Lees ook</h2>
              {related.map((r) => <a key={r.slug} href={`/kennis/${r.slug}/`} style={{ fontSize: 15, fontWeight: 600 }}>{r.title}</a>)}
            </div>
          )}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h2 style={{ fontSize: 17 }}>Ben je {v.name_singular}?</h2>
            <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Claim je profiel gratis en ontvang offerteaanvragen uit je regio.</p>
            <a href="/claim/" className="btn btn-outline" style={{ justifyContent: "center" }}>Claim je profiel</a>
          </div>
        </aside>
      </div>
    </main>
  );
}
