import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Gegevens corrigeren", robots: { index: false, follow: false } };
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
export default async function Corrigeren({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ status?: string }> }) {
  const v = await currentVertical(); const { slug } = await params; const { status } = await searchParams;
  const b = await getBusiness(slug, v.id); if (!b) notFound();
  return (
    <main className="wrap" style={{ padding: "24px 0 64px", maxWidth: 640 }}>
      <nav className="crumbs"><a href={`/bedrijf/${b.slug}/`}>{b.name}</a><span>/</span><b>Gegevens corrigeren</b></nav>
      <h1 style={{ fontSize: 30 }}>Gegevens corrigeren voor {b.name}</h1>
      <p className="lede" style={{ marginTop: 8 }}>Gratis en zonder account. Klopt het adres, telefoonnummer of de naam niet, of is het bedrijf gestopt? Laat het weten; we verwerken het binnen drie werkdagen. Wil je het profiel beheren, dan kun je het <a href={`/claim/${b.slug}/`}>claimen</a>.</p>
      {status === "sent" ? <div className="card" style={{ marginTop: 20, borderColor: "var(--green)", background: "var(--green-bg)" }}>Bedankt, we hebben je bericht ontvangen.</div> : (
        <form method="post" action="/corrigeren/verstuur/" className="card" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="slug" value={b.slug} /><input type="text" name="website2" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
          <label>Wat klopt er niet?<textarea name="bericht" required rows={5} style={{ ...input, minHeight: 120 }} /></label>
          <label>Je e-mailadres (voor een vraag terug)<input name="email" type="email" style={input} /></label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="verwijderen" /> Dit bedrijf bestaat niet meer of wil niet vermeld worden; haal het profiel weg</label>
          <button className="btn btn-primary" type="submit">Verstuur</button>
        </form>
      )}
    </main>
  );
}
