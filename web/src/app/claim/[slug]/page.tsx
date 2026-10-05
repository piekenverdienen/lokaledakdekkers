import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/db";
import { websiteDomain } from "@/lib/auth";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Claim je bedrijf", robots: { index: false, follow: false } };
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", minHeight: 48, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

export default async function ClaimBusiness({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string; email?: string; website?: string; domain?: string }> }) {
  const v = await currentVertical();
  const { slug } = await params;
  const sp = await searchParams;
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") notFound();
  const price = (v as unknown as { verified_price_year_cents?: number }).verified_price_year_cents ?? 7995;
  const msg: Record<string, React.ReactNode> = {
    sent: <><b>Mail verstuurd naar {sp.email}.</b> Open de link in die mail; je bent dan direct ingelogd en je profiel wordt opgebouwd uit je website. De link werkt 30 minuten.</>,
    site: <><b>We konden {sp.website} niet lezen.</b> Controleer het adres (begint het met www. of https://?) en probeer opnieuw.</>,
    naam: <><b>Op {sp.website} vinden we de naam {b.name} of het KvK-nummer niet terug.</b> Zet je bedrijfsnaam of KvK-nummer op je website (bijvoorbeeld in de footer) en probeer het daarna opnieuw.</>,
    email: <><b>Dit e-mailadres hoort niet bij {sp.domain}.</b> Gebruik een adres op {sp.domain} (bijvoorbeeld info@{sp.domain}), of het adres dat op je website staat.</>,
    limiet: <><b>Te veel pogingen.</b> Probeer het morgen opnieuw of mail naar info@{v.domain}.</>,
  };
  return (
    <main className="wrap" style={{ padding: "24px 0 64px", maxWidth: 680 }}>
      <nav className="crumbs"><a href="/claim/">Claim je bedrijf</a><span>/</span><b>{b.name}</b></nav>
      <h1 style={{ fontSize: 32 }}>{b.name}</h1>
      <p className="lede" style={{ marginTop: 8 }}>{b.city ?? ""}{b.kvk_number ? `, KvK ${b.kvk_number}` : ""}</p>
      {sp.status && msg[sp.status] && (
        <div className="card" style={{ marginTop: 24, borderColor: sp.status === "sent" ? "var(--green)" : "var(--amber)", background: sp.status === "sent" ? "var(--green-bg)" : "var(--amber-bg)" }}>{msg[sp.status]}</div>
      )}
      {b.status !== "unclaimed" && <div className="card" style={{ marginTop: 24 }}>Dit profiel is al geclaimd. Ben jij de eigenaar? <a href="/dashboard/">Log in</a>.</div>}
      {b.status === "unclaimed" && sp.status !== "sent" && (
        <form method="post" action="/claim/start/" className="card" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="slug" value={b.slug} />
          <h2 style={{ fontSize: 20 }}>Claim je bedrijf in twee stappen</h2>
          <p style={{ color: "var(--ink-2)" }}>Vul je website en e-mailadres in. We controleren automatisch of de site van {b.name} is en sturen een inloglink. Daarna bouwen we je profiel uit je website; jij kijkt het na en zet het online.</p>
          <label style={{ fontWeight: 600 }}>Website<input name="website" type="text" required defaultValue={sp.website ?? b.website ?? ""} placeholder="www.jouwbedrijf.nl" style={input} /></label>
          <label style={{ fontWeight: 600 }}>E-mailadres<input name="email" type="email" required defaultValue={sp.email ?? ""} placeholder={b.website ? `info@${websiteDomain(b.website)}` : "info@jouwbedrijf.nl"} style={input} /></label>
          <span className="srnote">Gebruik een e-mailadres op het domein van je website, of het adres dat op je website staat.</span>
          <button type="submit" className="btn btn-primary" style={{ fontSize: 17, minHeight: 50 }}>Stuur inloglink</button>
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, fontSize: 14, color: "var(--ink-2)" }}>
            Je profiel is pas online en geverifieerd na betaling van {(price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} euro per jaar, via iDEAL. Daarvoor krijg je: een compleet profiel met logo, foto's en diensten, het label Geverifieerd, een link naar je website, reviews met factuurbewijs en een offerteblok. Geen website? Mail naar info@{v.domain}.
          </div>
        </form>
      )}
    </main>
  );
}
