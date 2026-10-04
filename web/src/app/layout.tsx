import type { Metadata } from "next";
import "./globals.css";
import { currentVertical, cap } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical();
  return {
    title: { default: `${v.brand}: vind een betrouwbare ${v.name_singular} bij jou in de buurt`, template: `%s | ${v.brand}` },
    description: `Alle ${v.name_plural} van Nederland per plaats, met geverifieerde profielen, reviews met factuurbewijs en richtprijzen per regio.`,
    metadataBase: new URL(process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`),
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
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0B5C8F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></svg>
              <span style={{ color: "inherit" }}>{first}</span>&nbsp;<span>{rest.join(" ")}</span>
            </a>
            <div className="navlinks">
              <a href="/#provincies">Plaatsen</a>
              <a href="/kosten/">Kosten</a>
              <a href={`/betrouwbare-${v.name_singular}/`}>Betrouwbaar kiezen</a>
              <a href="/claim/" className="btn btn-primary">Claim je profiel</a>
            </div>
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
          </div>
        </footer>
      </body>
    </html>
  );
}
