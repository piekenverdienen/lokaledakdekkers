import type { Metadata } from "next";
import { createHmac } from "node:crypto";
import { currentVertical } from "@/lib/site";
import { COMPANY } from "@/lib/company";
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact/" } };
export const dynamic = "force-dynamic";
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fff" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const v = await currentVertical(); const { status } = await searchParams;
  const a = 2 + Math.floor(Math.random() * 7), b = 1 + Math.floor(Math.random() * 8);
  const sig = createHmac("sha256", process.env.SESSION_SECRET ?? "x").update(`${a}+${b}=${a + b}`).digest("hex").slice(0, 24);
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 760 }}>
      <h1 style={{ fontSize: 32 }}>Contact</h1>
      <p className="lede" style={{ marginTop: 8 }}>Vragen over de gids, je bedrijfsprofiel of een vermelding? Stuur een bericht; we reageren binnen twee werkdagen. Mailen kan ook: <a href={`mailto:info@${v.domain}`}>info@{v.domain}</a>.</p>
      {status === "sent" ? (
        <div className="card" style={{ marginTop: 20, borderColor: "var(--green)", background: "var(--green-bg)" }}><b>Bedankt, je bericht is verstuurd.</b> Je krijgt een kopie in je mailbox.</div>
      ) : (
        <form method="post" action="/contact/verstuur/" className="card" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>
          {status === "captcha" && <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--amber-bg)", border: "1px solid var(--amber)" }}>De rekensom klopte niet. Probeer het opnieuw.</div>}
          {status === "fout" && <div style={{ borderRadius: 10, padding: "10px 12px", background: "var(--amber-bg)", border: "1px solid var(--amber)" }}>Er ontbreekt nog iets. Vul alle velden in.</div>}
          <input type="text" name="website2" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
          <div className="grid cols-2" style={{ gap: 14 }}>
            <label style={{ fontWeight: 600 }}>Je naam<input name="name" required style={input} /></label>
            <label style={{ fontWeight: 600 }}>Je e-mailadres<input name="email" type="email" required style={input} /></label>
          </div>
          <label style={{ fontWeight: 600 }}>Waar gaat het over?
            <select name="topic" style={input}><option>Vraag over een bedrijfsprofiel</option><option>Mijn vermelding corrigeren of verwijderen</option><option>Claimen of betalen</option><option>Samenwerking of pers</option><option>Iets anders</option></select>
          </label>
          <label style={{ fontWeight: 600 }}>Je bericht<textarea name="message" required minLength={10} rows={6} style={{ ...input, minHeight: 140 }} /></label>
          <label style={{ fontWeight: 600 }}>Controle: hoeveel is {a} + {b}?<input name="captcha" required inputMode="numeric" style={{ ...input, maxWidth: 160 }} /></label>
          <input type="hidden" name="captcha_sig" value={sig} /><input type="hidden" name="captcha_a" value={a} /><input type="hidden" name="captcha_b" value={b} />
          <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start", minHeight: 48 }}>Verstuur</button>
        </form>
      )}
      <section className="prose" style={{ marginTop: 32 }}>
        <h2>Ben je {v.name_singular}?</h2>
        <p>Kloppen je gegevens niet, gebruik dan <a href="/corrigeren/">Gegevens corrigeren</a>. Wil je je profiel beheren, dan kun je het <a href="/claim/">claimen</a>. Alles over het aanbod staat op <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>.</p>
        <h2>Zoek je een {v.name_singular}?</h2>
        <p>We bemiddelen niet zelf. Zoek je plaats op de <a href="/">kaart</a> en neem rechtstreeks contact op met een bedrijf, of lees eerst <a href={`/betrouwbare-${v.name_singular}/`}>hoe je een betrouwbare {v.name_singular} kiest</a>.</p>
        <h2>Bedrijfsgegevens</h2>
        <p>{v.brand} is een dienst van {COMPANY.name}<br />{COMPANY.address}<br />KvK {COMPANY.kvk}{COMPANY.btw ? <><br />Btw {COMPANY.btw}</> : null}<br />E-mail: <a href={`mailto:info@${v.domain}`}>info@{v.domain}</a></p>
      </section>
    </main>
  );
}
