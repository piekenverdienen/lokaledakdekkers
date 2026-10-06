import type { Metadata } from "next";
import { one, q } from "@/lib/db";
import { currentVertical, cap } from "@/lib/site";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical();
  return {
    title: `${cap(v.name_singular)} checken: KvK-inschrijving en bedrijfsgegevens opzoeken`,
    description: `Zoek een ${v.name_singular} op naam, KvK-nummer of telefoonnummer en zie de feiten uit het Handelsregister: sinds wanneer ingeschreven, activiteit, vestiging en website.`,
    alternates: { canonical: "/dakdekker-check/" },
  };
}

type Row = { id: string; name: string; slug: string; kvk_number: string | null; city: string | null; street: string | null; housenumber: string | null; postcode: string | null; website: string | null; phone: string | null; kvk_started: string | null; kvk_checked_at: string | null; status: string; verified_at: string | null; reviews: number; avg: number | null };
type Ext = { name: string; kvk: string; city: string | null; started: string | null; activity: string | null } | null;

function since(d: string) {
  const start = new Date(d); const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()); if (now.getDate() < start.getDate()) months--;
  const y = Math.floor(months / 12), m = months % 12;
  return [y ? `${y} jaar` : "", m ? `${m} ${m === 1 ? "maand" : "maanden"}` : ""].filter(Boolean).join(" en ") || "minder dan een maand";
}
const fmt = (d: string) => new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });

async function external(kvk: string): Promise<Ext> {
  const key = process.env.OVERHEID_IO_KEY; if (!key || !/^\d{8}$/.test(kvk)) return null;
  try {
    const h = { "ovio-api-key": key, Accept: "application/json" };
    const r = await fetch(`https://api.overheid.io/v3/openkvk?query=${kvk}&size=5`, { headers: h, signal: AbortSignal.timeout(6000) }); if (!r.ok) return null;
    const j = await r.json(); const list: Record<string, unknown>[] = j?._embedded?.bedrijf ?? j?._embedded?.vestiging ?? [];
    const hit = list.find((b) => String(b.dossiernummer ?? b.kvkNummer ?? "") === kvk) ?? list[0]; if (!hit) return null;
    const href = (hit._links as { self?: { href?: string } } | undefined)?.self?.href ?? "";
    let d: Record<string, unknown> = hit;
    if (href) { const r2 = await fetch(`https://api.overheid.io${href.startsWith("/") ? href : `/${href}`}`, { headers: h, signal: AbortSignal.timeout(6000) }); if (r2.ok) d = await r2.json(); }
    const sbi = d.sbi ?? d.activiteiten ?? d.sbiActiviteiten; let activity: string | null = null;
    if (Array.isArray(sbi) && sbi.length) { const s0 = sbi[0] as Record<string, unknown> | string; activity = typeof s0 === "string" ? s0 : String(s0.omschrijving ?? s0.sbiOmschrijving ?? s0.code ?? ""); }
    const started = String(d.datumInschrijving ?? d.inschrijvingsdatum ?? d.datumAanvang ?? "") || null;
    return { name: String(d.handelsnaam ?? d.naam ?? hit.naam ?? ""), kvk, city: (d.plaats ?? d.vestigingsplaats ?? hit.plaats ?? null) as string | null, started: started && /^\d{4}-\d{2}-\d{2}/.test(started) ? started.slice(0, 10) : null, activity: activity || null };
  } catch { return null; }
}

export default async function DakdekkerCheck({ searchParams }: { searchParams: Promise<{ q?: string; id?: string }> }) {
  const v = await currentVertical(); const { q: raw, id } = await searchParams;
  const term = (raw ?? "").trim().slice(0, 80); const digits = term.replace(/\D/g, "");
  const sel = `select b.id, b.name, b.slug, b.kvk_number, b.city, b.street, b.housenumber, b.postcode, b.website, b.phone, b.kvk_started::text, b.kvk_checked_at::text, b.status, b.verified_at::text,
    (select count(*)::int from reviews r where r.business_id=b.id and r.status='published') as reviews, (select round(avg(score)::numeric,1) from reviews r where r.business_id=b.id and r.status='published') as avg from businesses b`;
  let rows: Row[] = [];
  if (id) rows = await q<Row>(`${sel} where b.id=$1 and b.vertical_id=$2 and b.status<>'hidden' and b.source<>'test'`, [id, v.id]);
  else if (term) {
    if (/^\d{8}$/.test(digits) && digits.length === term.replace(/\s/g, "").length) rows = await q<Row>(`${sel} where b.vertical_id=$1 and b.kvk_number=$2 and b.status<>'hidden' and b.source<>'test' limit 10`, [v.id, digits]);
    else if (digits.length >= 9) rows = await q<Row>(`${sel} where b.vertical_id=$1 and b.phone is not null and right(regexp_replace(b.phone,'\\D','','g'),9)=$2 and b.status<>'hidden' and b.source<>'test' limit 10`, [v.id, digits.slice(-9)]);
    else if (term.length >= 3) rows = await q<Row>(`${sel} where b.vertical_id=$1 and b.status<>'hidden' and b.source<>'test' and b.name ilike $2 order by (b.status in ('claimed','pro')) desc, b.name limit 10`, [v.id, `%${term.replace(/[%_]/g, "")}%`]);
  }
  const single = rows.length === 1 ? rows[0] : null;
  const ext = term && !rows.length && /^\d{8}$/.test(digits) ? await external(digits) : null;
  const total = (await one<{ n: number }>("select count(*)::int as n from businesses where vertical_id=$1 and status<>'hidden' and source<>'test'", [v.id]))?.n ?? 0;
  const Fact = ({ k, children }: { k: string; children: React.ReactNode }) => <div style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--line)", fontSize: 16 }}><span style={{ color: "var(--ink-3)" }}>{k}</span><span>{children}</span></div>;
  return (
    <main className="wrap" style={{ paddingTop: 28, paddingBottom: 64, maxWidth: 860 }}>
      <span className="eyebrow">Gratis check</span>
      <h1 style={{ marginTop: 6 }}>{cap(v.name_singular)} checken</h1>
      <p className="lede" style={{ marginTop: 10, maxWidth: 680 }}>Zoek een {v.name_singular} op bedrijfsnaam, KvK-nummer of telefoonnummer. Je ziet de gegevens uit het Handelsregister en wat er bij ons bekend is, zodat je zelf kunt beoordelen met wie je in zee gaat.</p>
      <form className="search" method="get" style={{ marginTop: 18, maxWidth: 640 }}>
        <input name="q" defaultValue={term} placeholder="Bedrijfsnaam, KvK-nummer of telefoonnummer" aria-label="Zoek een bedrijf" autoComplete="off" />
        <button className="btn btn-primary" type="submit">Check</button>
      </form>
      <p className="srnote" style={{ marginTop: 8 }}>{total.toLocaleString("nl-NL")} {v.name_plural} uit het Handelsregister in onze gids.</p>

      {term && rows.length > 1 && (
        <section style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          <h2 style={{ fontSize: 20 }}>{rows.length} bedrijven gevonden</h2>
          {rows.map((r) => <a key={r.id} href={`/dakdekker-check/?id=${r.id}`} className="card card-link" style={{ padding: "12px 16px" }}><b>{r.name}</b><small>{[r.city, r.kvk_number ? `KvK ${r.kvk_number}` : null].filter(Boolean).join(", ")}</small></a>)}
        </section>
      )}

      {single && (
        <section className="card" style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{single.name}</h2>
          <Fact k="KvK-nummer">{single.kvk_number ?? "Niet bekend"}</Fact>
          <Fact k="Ingeschreven sinds">{single.kvk_started ? <>{fmt(single.kvk_started)} ({since(single.kvk_started)})</> : "Niet bekend in onze gegevens"}</Fact>
          <Fact k="Geregistreerde activiteit">Dakdekken en bouwkundige dakwerkzaamheden</Fact>
          <Fact k="Vestiging">{[single.street ? `${single.street} ${single.housenumber ?? ""}`.trim() : null, [single.postcode, single.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Niet bekend"}</Fact>
          <Fact k="Website">{single.website ? <a href={single.website} rel="nofollow noopener" target="_blank">{single.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a> : "Geen website bekend"}</Fact>
          <Fact k="Telefoonnummer">{single.phone ?? "Niet bekend"}</Fact>
          <Fact k="Profiel bevestigd door het bedrijf">{single.verified_at ? `Ja, sinds ${fmt(single.verified_at)}` : "Nee"}</Fact>
          <Fact k="Reviews op Lokale Dakdekkers">{single.reviews ? `${single.reviews}, gemiddeld ${String(single.avg).replace(".", ",")} van de 5` : "Nog geen"}</Fact>
          <Fact k="Gegevens laatst gecontroleerd">{single.kvk_checked_at ? fmt(single.kvk_checked_at) : "Niet bekend"}</Fact>
          <div className="actions" style={{ marginTop: 14 }}>
            <a href={`/bedrijf/${single.slug}/`} className="btn btn-outline">Bekijk het profiel</a>
            {single.kvk_number && <a href={`https://www.kvk.nl/zoeken/?source=all&q=${single.kvk_number}`} className="btn btn-ghost" rel="noopener" target="_blank">Zelf nakijken op kvk.nl</a>}
          </div>
          <p className="srnote" style={{ marginTop: 12 }}>Dit zijn registratiegegevens. Ze zeggen niets over de kwaliteit van het werk. Klopt er iets niet? <a href={`/corrigeren/${single.slug}/`}>Geef een correctie door</a>.</p>
        </section>
      )}

      {term && !rows.length && (
        <section className="card" style={{ marginTop: 24 }}>
          {ext ? (<>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Gevonden in het Handelsregister</h2>
            <Fact k="Naam">{ext.name || "Niet bekend"}</Fact>
            <Fact k="KvK-nummer">{ext.kvk}</Fact>
            <Fact k="Ingeschreven sinds">{ext.started ? <>{fmt(ext.started)} ({since(ext.started)})</> : "Niet bekend"}</Fact>
            <Fact k="Geregistreerde activiteit">{ext.activity ?? "Niet bekend"}</Fact>
            <Fact k="Vestigingsplaats">{ext.city ?? "Niet bekend"}</Fact>
            <p style={{ marginTop: 12, color: "var(--ink-2)" }}>Dit bedrijf staat niet in onze gids van {v.name_plural}. Onze gids bevat bedrijven die bij de KvK als {v.name_singular} staan ingeschreven; een bedrijf kan dakwerk ook onder een andere activiteit uitvoeren.</p>
          </>) : (<>
            <h2 style={{ fontSize: 20, marginBottom: 6 }}>Geen {v.name_singular} gevonden met &ldquo;{term}&rdquo;</h2>
            <p style={{ color: "var(--ink-2)" }}>Dat kan verschillende oorzaken hebben: een andere schrijfwijze of handelsnaam, een nieuw telefoonnummer, of een inschrijving onder een andere activiteit. Probeer het KvK-nummer, dat staat verplicht op offertes en facturen, of zoek zelf op <a href={`https://www.kvk.nl/zoeken/?source=all&q=${encodeURIComponent(term)}`} rel="noopener" target="_blank">kvk.nl</a>.</p>
          </>)}
        </section>
      )}

      <section className="prose" style={{ marginTop: 36 }}>
        <h2>Wat je verder zelf kunt nagaan</h2>
        <p>Deze tips gelden voor elke {v.name_singular}, niet voor een bedrijf in het bijzonder.</p>
        <ul>
          <li><b>KvK-nummer op de offerte.</b> Een bedrijf is verplicht het op offertes en facturen te zetten. Vergelijk het met het nummer hierboven.</li>
          <li><b>Schriftelijke offerte met vaste prijs,</b> met btw, werkzaamheden per regel en garantie.</li>
          <li><b>Betaal niet het volledige bedrag vooraf.</b> Een aanbetaling voor materiaal is gebruikelijk, de rest na oplevering.</li>
          <li><b>Neem bedenktijd.</b> Bij een overeenkomst aan de deur heb je wettelijk 14 dagen bedenktijd.</li>
          <li><b>Vraag naar referenties</b> van recent werk in je eigen omgeving.</li>
        </ul>
        <p>Alle controles uitgebreid: <a href={`/betrouwbare-${v.name_singular}/`}>een betrouwbare {v.name_singular} kiezen</a>. Wat een klus ongeveer kost lees je in <a href="/kennis/wat-kost-een-dakdekker/">wat kost een {v.name_singular}</a>.</p>
      </section>
    </main>
  );
}
