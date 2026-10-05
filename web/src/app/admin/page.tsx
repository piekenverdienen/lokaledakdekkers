import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Beheer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Row({ children }: { children: React.ReactNode }) { return <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>{children}</div>; }
const Btn = ({ actie, id, label, kind = "btn-outline", extra }: { actie: string; id: string; label: string; kind?: string; extra?: Record<string, string> }) => (
  <form method="post" action="/admin/actie/" style={{ display: "inline" }}><input type="hidden" name="actie" value={actie} /><input type="hidden" name="id" value={id} />{extra && Object.entries(extra).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}<button className={`btn ${kind}`} style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>{label}</button></form>
);

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; ok?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/dashboard/");
  if (!user.is_admin) redirect("/dashboard/");
  const v = await currentVertical();
  const { tab = "reviews", q: term = "", ok } = await searchParams;

  const counts = (await q<{ reviews: number; verzoeken: number; betalingen: number; claims: number }>(`
    select (select count(*)::int from reviews where status='pending' and email_verified_at is not null) as reviews,
           (select count(*)::int from claims where method in ('correctie','verwijderverzoek') and verified_at is null) as verzoeken,
           (select count(*)::int from payments where status='paid' and paid_at > now() - interval '30 days') as betalingen,
           (select count(*)::int from businesses where vertical_id=$1 and status in ('claimed','pro')) as claims`, [v.id]))[0];
  const tabs = [["reviews", `Reviews (${counts.reviews})`], ["verzoeken", `Correcties (${counts.verzoeken})`], ["betalingen", `Betalingen (${counts.betalingen})`], ["bedrijven", "Bedrijven"], ["claims", `Geverifieerd (${counts.claims})`]];

  const reviews = tab === "reviews" ? await q<{ id: string; name: string; score: number; body: string; service_slug: string | null; invoice_ref: string | null; created_at: string; business: string; slug: string }>(`
    select r.id, r.name, r.score, r.body, r.service_slug, r.invoice_ref, r.created_at::text, b.name as business, b.slug from reviews r join businesses b on b.id=r.business_id
    where r.status='pending' and r.email_verified_at is not null order by r.created_at`) : [];
  const verzoeken = tab === "verzoeken" ? await q<{ id: string; email: string; method: string; code: string | null; created_at: string; business: string; slug: string; bid: string }>(`
    select c.id, c.email, c.method, c.code, c.created_at::text, b.name as business, b.slug, b.id as bid from claims c join businesses b on b.id=c.business_id
    where c.method in ('correctie','verwijderverzoek') and c.verified_at is null order by c.created_at`) : [];
  const betalingen = tab === "betalingen" ? await q<{ id: string; amount_cents: number; status: string; paid_at: string | null; consumer_name: string | null; provider_id: string; business: string; slug: string }>(`
    select p.id, p.amount_cents, p.status, p.paid_at::text, p.consumer_name, p.provider_id, b.name as business, b.slug from payments p join businesses b on b.id=p.business_id order by p.created_at desc limit 100`) : [];
  const bedrijven = tab === "bedrijven" && term.length >= 2 ? await q<{ id: string; name: string; slug: string; city: string | null; status: string; kvk_number: string | null; website: string | null }>(`
    select id, name, slug, city, status, kvk_number, website from businesses where vertical_id=$1 and (name ilike '%'||$2||'%' or kvk_number=$2 or slug=$2) order by name limit 30`, [v.id, term]) : [];
  const claims = tab === "claims" ? await q<{ id: string; name: string; slug: string; city: string | null; status: string; verified_at: string | null; paid_until: string | null; email: string | null }>(`
    select id, name, slug, city, status, verified_at::text, paid_until::text, email from businesses where vertical_id=$1 and (status in ('claimed','pro') or owner_user_id is not null) order by coalesce(verified_at, updated_at) desc limit 100`, [v.id]) : [];

  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 28 }}>Beheer</h1>
        <span style={{ fontSize: 14, color: "var(--ink-3)" }}>{user.email} <a href="/uitloggen/">Uitloggen</a></span>
      </div>
      {ok && <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)", marginTop: 12 }}>Gedaan.</div>}
      <div className="chips" style={{ marginTop: 16 }}>{tabs.map(([t, l]) => <a key={t} href={`/admin/?tab=${t}`} className={`pill${tab === t ? " on" : ""}`}>{l}</a>)}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
        {tab === "reviews" && (reviews.length === 0 ? <div className="card">Geen reviews te beoordelen.</div> : reviews.map((r) => (
          <div key={r.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="meta"><b>{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</b><span>{r.name}</span><span>over <a href={`/bedrijf/${r.slug}/`}>{r.business}</a></span>{r.service_slug && <span>{r.service_slug}</span>}{r.invoice_ref && <span>factuur: {r.invoice_ref}</span>}<span>{r.created_at.slice(0, 10)}</span></div>
            <p style={{ color: "var(--ink-2)" }}>{r.body}</p>
            <div className="actions"><Btn actie="review_publiceer" id={r.id} label="Plaatsen" kind="btn-primary" />{r.invoice_ref && <Btn actie="review_publiceer" id={r.id} label="Plaatsen als Geverifieerde klus" extra={{ factuur: "1" }} />}<Btn actie="review_afwijzen" id={r.id} label="Afwijzen" /></div>
          </div>
        )))}
        {tab === "verzoeken" && (verzoeken.length === 0 ? <div className="card">Geen openstaande verzoeken.</div> : verzoeken.map((c) => (
          <div key={c.id} className="card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="meta"><b>{c.method === "verwijderverzoek" ? "Verwijderverzoek" : "Correctie"}</b><span><a href={`/bedrijf/${c.slug}/`}>{c.business}</a></span><span>{c.email}</span><span>{c.created_at.slice(0, 10)}</span></div>
            <p style={{ color: "var(--ink-2)" }}>{c.code}</p>
            <div className="actions">{c.method === "verwijderverzoek" && <Btn actie="bedrijf_verberg" id={c.bid} label="Profiel verbergen" kind="btn-primary" extra={{ claim: c.id }} />}<a href={`/dashboard/${c.slug}/`} className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Profiel bewerken</a><Btn actie="verzoek_afgehandeld" id={c.id} label="Afgehandeld" /></div>
          </div>
        )))}
        {tab === "betalingen" && (betalingen.length === 0 ? <div className="card">Nog geen betalingen.</div> : betalingen.map((p) => (
          <Row key={p.id}><span><b><a href={`/bedrijf/${p.slug}/`}>{p.business}</a></b><br /><small>{(p.amount_cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} euro, {p.status}{p.paid_at ? `, betaald ${p.paid_at.slice(0, 10)}` : ""}{p.consumer_name ? `, ${p.consumer_name}` : ""}</small></span><small style={{ color: "var(--ink-3)" }}>{p.provider_id}</small></Row>
        )))}
        {tab === "bedrijven" && (<>
          <form className="search" method="get"><input type="hidden" name="tab" value="bedrijven" /><input name="q" defaultValue={term} placeholder="Naam, KvK-nummer of slug" /><button className="btn btn-primary" type="submit">Zoek</button></form>
          {bedrijven.map((b) => (
            <Row key={b.id}><span><b><a href={`/bedrijf/${b.slug}/`}>{b.name}</a></b><br /><small>{b.city ?? ""}{b.kvk_number ? `, KvK ${b.kvk_number}` : ""}, {b.status}{b.website ? `, ${b.website.replace(/^https?:\/\//, "")}` : ""}</small></span>
              <div className="actions"><a href={`/dashboard/${b.slug}/`} className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Bewerken</a>{b.status === "hidden" ? <Btn actie="bedrijf_toon" id={b.id} label="Weer tonen" /> : <Btn actie="bedrijf_verberg" id={b.id} label="Verbergen" />}</div></Row>
          ))}
        </>)}
        {tab === "claims" && (claims.length === 0 ? <div className="card">Nog geen geclaimde profielen.</div> : claims.map((b) => (
          <Row key={b.id}><span><b><a href={`/bedrijf/${b.slug}/`}>{b.name}</a></b><br /><small>{b.city ?? ""}, {b.status === "unclaimed" ? "geclaimd, nog niet betaald" : b.status}{b.verified_at ? `, geverifieerd ${b.verified_at.slice(0, 10)}` : ""}{b.paid_until ? `, betaald tot ${b.paid_until}` : ""}{b.email ? `, ${b.email}` : ""}</small></span><a href={`/dashboard/${b.slug}/`} className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Bekijken</a></Row>
        )))}
      </div>
    </main>
  );
}
