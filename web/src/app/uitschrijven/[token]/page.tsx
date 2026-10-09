import type { Metadata } from "next";
import { one } from "@/lib/db";
export const metadata: Metadata = { title: "Afmelden", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
// Afmelden vraagt een klik op de knop: virusscanners die links in mails openen, melden zo niemand per ongeluk af.
export default async function Uitschrijven({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string }> }) {
  const { token } = await params; const { ok } = await searchParams;
  const o = await one<{ name: string; slug: string; opted: boolean }>("select b.name, b.slug, b.outreach_opt_out as opted from outreach o join businesses b on b.id=o.business_id where o.token=$1", [token]);
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 640 }}>
      {!o ? (<h1 style={{ fontSize: 28 }}>Deze link is niet (meer) geldig</h1>) : ok || o.opted ? (<>
        <h1 style={{ fontSize: 28 }}>Je krijgt geen mails meer over deze pagina</h1>
        <p className="lede" style={{ marginTop: 10 }}>We sturen geen berichten meer over {o.name}. De basisvermelding uit het Handelsregister blijft staan; wil je die laten aanpassen of weghalen, dan kan dat gratis via <a href={`/corrigeren/${o.slug}/`}>gegevens corrigeren</a>.</p>
      </>) : (<>
        <h1 style={{ fontSize: 28 }}>Afmelden voor mails over {o.name}?</h1>
        <p className="lede" style={{ marginTop: 10 }}>Na bevestigen sturen we geen berichten meer over deze pagina.</p>
        <form method="post" action={`/api/unsubscribe/${token}/`} style={{ marginTop: 18 }}>
          <input type="hidden" name="via" value="pagina" />
          <button className="btn btn-primary" type="submit">Ja, afmelden</button>
        </form>
        <p style={{ marginTop: 16 }}><a href={`/bedrijf/${o.slug}/?eigenaar=1`}>Toch de pagina bekijken</a></p>
      </>)}
    </main>
  );
}
