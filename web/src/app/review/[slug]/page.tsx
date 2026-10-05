import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Schrijf een review", robots: { index: false, follow: false } };
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

export default async function Review({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string }> }) {
  const v = await currentVertical(); const { slug } = await params; const { status } = await searchParams;
  const b = await getBusiness(slug, v.id); if (!b || b.status === "hidden") notFound();
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 680 }}>
      <nav className="crumbs"><a href={`/bedrijf/${b.slug}/`}>{b.name}</a><span>/</span><b>Review</b></nav>
      <h1 style={{ fontSize: 30 }}>Hoe was je ervaring met {b.name}?</h1>
      <p className="lede" style={{ marginTop: 8 }}>Je review helpt anderen kiezen. Na het versturen krijg je een mail om te bevestigen dat jij het bent; daarna wordt je review binnen een werkdag geplaatst.</p>
      {status === "sent" ? (
        <div className="card" style={{ marginTop: 20, borderColor: "var(--green)", background: "var(--green-bg)" }}><b>Bijna klaar.</b> Open de bevestigingslink in je mail (kijk ook in de spam). Zonder bevestiging plaatsen we de review niet.</div>
      ) : (
        <form method="post" action="/review/verstuur/" className="card" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="slug" value={b.slug} /><input type="text" name="website2" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ fontWeight: 600, marginBottom: 6 }}>Je beoordeling</legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="pill" style={{ cursor: "pointer", gap: 6 }}><input type="radio" name="score" value={n} required defaultChecked={n === 5} /> {n} {n === 1 ? "ster" : "sterren"}</label>
              ))}
            </div>
          </fieldset>
          <label style={{ fontWeight: 600 }}>Wat is er gedaan?
            <select name="service" style={input}><option value="">Kies een soort werk</option>{v.services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
          </label>
          <label style={{ fontWeight: 600 }}>Je ervaring<textarea name="body" required minLength={40} rows={6} style={{ ...input, minHeight: 140 }} placeholder="Wat ging goed, wat kon beter, hoe verliep de communicatie en de oplevering? Minimaal 40 tekens." /></label>
          <label style={{ fontWeight: 600 }}>Je naam (zo verschijnt hij bij de review)<input name="name" required placeholder="Bijvoorbeeld M. de Vries" style={input} /></label>
          <label style={{ fontWeight: 600 }}>Je e-mailadres (niet zichtbaar, alleen voor de bevestiging)<input name="email" type="email" required style={input} /></label>
          <label style={{ fontWeight: 600 }}>Factuurnummer en datum (optioneel)<input name="invoice" placeholder="Bijvoorbeeld 2026-0143, 12 september 2026" style={input} /></label>
          <span className="srnote">Met een factuur krijgt je review het label Geverifieerde klus. We vragen de factuur alleen op als dat nodig is en tonen hem nooit.</span>
          <button className="btn btn-primary" type="submit" style={{ fontSize: 17, minHeight: 50 }}>Review versturen</button>
        </form>
      )}
    </main>
  );
}
