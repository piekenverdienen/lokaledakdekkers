import type { Metadata } from "next";
import "./globals.css";
import CookieNotice from "@/components/CookieNotice";
import Script from "next/script";
import BrandMark from "@/components/BrandMark";
import Hit from "@/components/Hit";
import { currentVertical, cap } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical();
  return {
    title: { default: `${v.brand}: weet wie je het dak op laat`, template: `%s | ${v.brand}` },
    description: `Alle ${v.name_plural} van Nederland per plaats, met geverifieerde profielen, reviews met factuurbewijs en richtprijzen per regio.`,
    metadataBase: new URL(process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`),
    openGraph: { siteName: v.brand, locale: "nl_NL", images: [{ url: "/og-default.png", width: 1200, height: 630, alt: `${v.brand}: weet wie je het dak op laat` }] },
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const v = await currentVertical();
  const [first, ...rest] = v.brand.split(" ");
  return (
    <html lang="nl">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#142E3A" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: v.brand, url: `https://${v.domain}/`, logo: `https://${v.domain}/logo.png`, slogan: "Weet wie je het dak op laat.", email: `info@${v.domain}`, parentOrganization: { "@type": "Organization", name: "Rombots Digital B.V." } }) }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>
        <header className="header">
          <nav className="wrap nav">
            <a href="/" className="brand" aria-label={v.brand}>
              <span className="logo-mark" aria-hidden="true"><BrandMark size={34} /></span>
              <span className="brand-text"><span>{first} <span>{rest.join(" ")}</span></span><small>Weet wie je het dak op laat.</small></span>
            </a>
            <div className="navlinks desktop">
              <a href="/zoeken/">Vind een {v.name_singular}</a>
              <a href="/kosten/">Kosten</a>
              <a href="/kennis/">Kennis</a>
              <a href={`/betrouwbare-${v.name_singular}/`}>Betrouwbaar kiezen</a>
              <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>
              <a href="/claim/" className="btn btn-outline">Claim je profiel</a>
            </div>
            <details className="menu">
              <summary className="menu-toggle" aria-label="Menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#13202B" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
              </summary>
              <div className="navlinks mobile">
                <a href="/zoeken/">Vind een {v.name_singular}</a>
                <a href="/kosten/">Kosten</a>
                <a href="/kennis/">Kennis</a>
                <a href={`/betrouwbare-${v.name_singular}/`}>Betrouwbaar kiezen</a>
                <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>
                <a href="/dashboard/">Inloggen</a>
                <a href="/claim/" className="btn btn-outline">Claim je profiel</a>
              </div>
            </details>
          </nav>
        </header>
        {children}
        <footer className="wrap footer">
          <span>
            {v.brand} is een dienst van Rombots Digital B.V. Plaatsen en gemeenten uit OpenStreetMap-data, ODbL. Bedrijfsgegevens uit het KvK Handelsregister.
          </span>
          <div>
            <a href="/privacy/">Privacy</a>
            <a href="/bedrijf-verwijderen/">Bedrijf verwijderen</a>
            <a href="/reviewbeleid/">Reviewbeleid</a>
            <a href="/voorwaarden/">Voorwaarden</a>
            <a href="/dakdekker-check/">Dakdekker checken</a>
            <a href="/contact/">Contact</a>
            <a href="/kennis/">Kennis</a>
          </div>
        </footer>
        <Script id="ga-consent" strategy="beforeInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500});try{if(document.cookie.indexOf('ld_consent=analytics')>-1){gtag('consent','update',{analytics_storage:'granted'});}}catch(e){}gtag('js',new Date());gtag('config','G-P5N8E6YY81');`}</Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-P5N8E6YY81" strategy="afterInteractive" />
        <CookieNotice />
        <Hit />
      </body>
    </html>
  );
}
