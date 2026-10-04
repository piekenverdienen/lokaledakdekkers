import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/db";
import { websiteDomain } from "@/lib/auth";
import { currentVertical, cap } from "@/lib/site";
export const metadata: Metadata = { title: "Claim je profiel", robots: { index: false, follow: false } };

export default async function ClaimBusiness({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string; email?: string }> }) {
  const v = await currentVertical();
  const { slug } = await params;
  const { status, email } = await searchParams;
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") notFound();
  const dom = websiteDomain(b.website);
  return (
    <main className="wrap" style={{ padding: "32px 24px 64px", maxWidth: 680 }}>
      <nav className="crumbs"><a href="/claim/">Claim je profiel</a><span>/</span><b>{b.name}</b></nav>
      <h1 style={{ fontSize: 32 }}>{b.name}</h1>
      <p className="lede" style={{ marginTop: 8 }}>{b.city ?? ""}{b.kvk_number ? `, KvK ${b.kvk_number}` : ""}{b.website ? `, ${websiteDomain(b.website)}` : ""}</p>

      {status === "sent" && (
        <div className="card" style={{ marginTop: 24, borderColor: "var(--green)", background: "var(--green-bg)" }}>
          <b>Mail verstuurd naar {email}.</b> Open de link in die mail om je profiel te claimen. De link werkt 30 minuten. Niets ontvangen? Kijk in de spam, of probeer het opnieuw.
        </div>
      )}
      {status === "mismatch" && (
        <div className="card" style={{ marginTop: 24, borderColor: "var(--amber)", background: "var(--amber-bg)" }}>
          <b>Dat e-mailadres hoort niet bij {dom || "de website van dit bedrijf"}.</b> Gebruik een adres op het domein van je website (bijvoorbeeld info@{dom || "jouwbedrijf.nl"}). Lukt dat niet? Kies hieronder de brief-met-code.
        </div>
      )}
      {status === "letter" && (
        <div className="card" style={{ marginTop: 24, borderColor: "var(--green)", background: "var(--green-bg)" }}>
          <b>Aangevraagd.</b> Je ontvangt binnen een week een brief met een code op het KvK-adres. Met die code en je e-mailadres claim je het profiel op deze pagina.
        </div>
      )}
      {b.status !== "unclaimed" && <div className="card" style={{ marginTop: 24 }}>Dit profiel is al geclaimd. Ben jij de eigenaar? <a href="/dashboard/">Log in</a>.</div>}

      {b.status === "unclaimed" && status !== "sent" && status !== "letter" && (
        <form method="post" action="/claim/start/" className="card" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="slug" value={b.slug} />
          <h2 style={{ fontSize: 20 }}>Stap 1: verifieer dat dit jouw bedrijf is</h2>
          <p style={{ color: "var(--ink-2)" }}>
            {dom ? <>Vul een e-mailadres in op <b>{dom}</b>. Je krijgt een link waarmee je direct bent ingelogd.</> : <>Dit bedrijf heeft geen website in onze gegevens. Vul je e-mailadres in; we sturen dan een brief met een code naar het KvK-adres.</>}
          </p>
          <label htmlFor="email" style={{ fontWeight: 600 }}>E-mailadres</label>
          <input id="email" name="email" type="email" required placeholder={dom ? `info@${dom}` : "jij@voorbeeld.nl"} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", minHeight: 48, fontSize: 16, fontFamily: "inherit" }} />
          <input type="hidden" name="website" value={b.website ?? ""} />
          <div className="actions">
            <button type="submit" name="method" value="email" className="btn btn-primary">Stuur inloglink</button>
            <button type="submit" name="method" value="letter" className="btn btn-outline">Brief met code aanvragen</button>
          </div>
          <span className="srnote">Als je al een code uit de brief hebt: vul hem hieronder in.</span>
          <div style={{ display: "flex", gap: 8 }}>
            <input name="code" placeholder="Code uit de brief" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", flex: 1 }} />
            <button type="submit" name="method" value="code" className="btn btn-outline">Code gebruiken</button>
          </div>
        </form>
      )}
    </main>
  );
}
