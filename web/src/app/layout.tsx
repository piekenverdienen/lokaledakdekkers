import type { Metadata } from "next";
import "./globals.css";
import { currentVertical, cap } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical();
  return {
    title: { default: `${v.brand}: vind een betrouwbare ${v.name_singular} bij jou in de buurt`, template: `%s | ${v.brand}` },
    description: `Alle ${v.name_plural} van Nederland per plaats, met geverifieerde profielen, reviews met factuurbewijs en richtprijzen per regio.`,
    metadataBase: new URL(process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`),
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const v = await currentVertical();
  const [first, ...rest] = v.brand.split(" ");
  return (
    <html lang="nl">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Source+Sans+3:wght@400;600&display=swap" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <header className="header">
          <nav className="wrap nav">
            <a href="/" className="brand" aria-label={v.brand}>
              <span className="logo-mark" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3.5 12.5L12 5l8.5 7.5" stroke="#F2B45C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M6.5 11.5V19h11v-7.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M10.5 19v-4.5h3V19" stroke="#FFFFFF" strokeWidth="2" strokeLinejoin="round" /></svg>
              </span>
              <span className="brand-text"><span>{first} <span>{rest.join(" ")}</span></span><small>Geverifieerd, lokaal, eerlijk</small></span>
            </a>
            <div className="navlinks desktop">
              <a href="/#provincies">Plaatsen</a>
              <a href="/kosten/">Kosten</a>
              <a href="/kennis/">Kennis</a>
              <a href={`/betrouwbare-${v.name_singular}/`}>Betrouwbaar kiezen</a>
              <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>
              <a href="/claim/" className="btn btn-primary">Claim je profiel</a>
            </div>
            <details className="menu">
              <summary className="menu-toggle" aria-label="Menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#13202B" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
              </summary>
              <div className="navlinks mobile">
                <a href="/#provincies">Plaatsen</a>
                <a href="/kosten/">Kosten</a>
                <a href="/kennis/">Kennis</a>
                <a href={`/betrouwbare-${v.name_singular}/`}>Betrouwbaar kiezen</a>
                <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>
                <a href="/dashboard/">Inloggen</a>
                <a href="/claim/" className="btn btn-primary">Claim je profiel</a>
              </div>
            </details>
          </nav>
        </header>
        {children}
        <footer className="wrap footer">
          <span>
            {v.brand} is onderdeel van de Lokaal-gidsen. Plaatsen en gemeenten uit OpenStreetMap-data, ODbL. Bedrijfsgegevens uit het KvK Handelsregister.
          </span>
          <div>
            <a href="/privacy/">Privacy</a>
            <a href="/bedrijf-verwijderen/">Bedrijf verwijderen</a>
            <a href="/reviewbeleid/">Reviewbeleid</a>
            <a href="/voorwaarden/">Voorwaarden</a>
            <a href="/contact/">Contact</a>
            <a href="/kennis/">Kennis</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
