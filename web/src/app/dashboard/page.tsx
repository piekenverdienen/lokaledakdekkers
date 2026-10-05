import type { Metadata } from "next";
import { q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ fout?: string; status?: string }> }) {
  const v = await currentVertical();
  const { fout, status } = await searchParams;
  const user = await getUser();
  if (!user) {
    return (
      <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 560 }}>
        <h1 style={{ fontSize: 30 }}>Inloggen</h1>
        <p className="lede" style={{ marginTop: 8 }}>Geen wachtwoord nodig. Vul het e-mailadres in waarmee je je profiel hebt geclaimd; je krijgt een inloglink.</p>
        {fout === "link" && <div className="card" style={{ marginTop: 16, borderColor: "var(--amber)", background: "var(--amber-bg)" }}>Die link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan.</div>}
        {status === "sent" && <div className="card" style={{ marginTop: 16, borderColor: "var(--green)", background: "var(--green-bg)" }}>Inloglink verstuurd. Kijk in je mail (en in de spam).</div>}
        <form method="post" action="/dashboard/login/" className="card" style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <label htmlFor="email" style={{ fontWeight: 600 }}>E-mailadres</label>
          <input id="email" name="email" type="email" required style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "0 12px", minHeight: 48, fontSize: 16, fontFamily: "inherit" }} />
          <button className="btn btn-primary" type="submit">Stuur inloglink</button>
        </form>
        <p style={{ marginTop: 16 }}>Nog geen profiel geclaimd? <a href="/claim/">Zoek je bedrijf</a>.</p>
      </main>
    );
  }
  const mine = await q<{ name: string; slug: string; status: string; city: string | null }>("select name, slug, status, city from businesses where owner_user_id=$1 and vertical_id=$2 order by name", [user.id, v.id]);
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 760 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ fontSize: 30 }}>Jouw bedrijven</h1>
        <span style={{ color: "var(--ink-3)", fontSize: 14 }}>{user.email} <a href="/uitloggen/">Uitloggen</a></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {mine.length === 0 && <div className="card">Je hebt nog geen bedrijf geclaimd. <a href="/claim/">Zoek je bedrijf</a>.</div>}
        {mine.map((b) => (
          <a key={b.slug} href={`/dashboard/${b.slug}/`} className="card card-link" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <span><b>{b.name}</b><br /><small>{b.city ?? ""}</small></span>
            <span className={b.status === "unclaimed" ? "badge" : "verified"}>{b.status === "unclaimed" ? "Nog niet live" : b.status === "pro" ? "Pro" : "Live, geverifieerd"}</span>
          </a>
        ))}
      </div>
    </main>
  );
}
