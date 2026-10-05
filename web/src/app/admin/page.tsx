import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { one, q } from "@/lib/db";
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
  const tabs = [["reviews", `Reviews (${counts.reviews})`], ["verzoeken", `Correcties (${counts.verzoeken})`], ["betalingen", `Betalingen (${counts.betalingen})`], ["bedrijven", "Bedrijven"], ["claims", `Geverifieerd (${counts.claims})`], ["test", "Testen"], ["campagne", "Campagne"], ["stats", "Bezoekers"]];

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
        {tab === "campagne" && (await (async () => {
          const on = (await one<{ value: string }>("select value from settings where key='outreach_enabled'"))?.value === "1";
          const perDay = (await one<{ value: string }>("select value from settings where key='outreach_per_day'"))?.value ?? "200";
          const c = (await q<{ built: number; with_email: number; sent: number; reminded: number; clicked: number; claimed: number; optout: number; today: number }>(`
            select (select count(*)::int from businesses where vertical_id=$1 and profile_built_at is not null) as built,
                   (select count(*)::int from businesses where vertical_id=$1 and outreach_email is not null and profile_built_at is not null and status='unclaimed' and not outreach_opt_out) as with_email,
                   (select count(*)::int from outreach) as sent, (select count(*)::int from outreach where reminder_at is not null) as reminded,
                   (select count(*)::int from outreach where clicked_at is not null) as clicked,
                   (select count(*)::int from outreach o join businesses b on b.id=o.business_id where b.owner_user_id is not null) as claimed,
                   (select count(*)::int from businesses where outreach_opt_out) as optout,
                   (select count(*)::int from outreach where sent_at::date=current_date or reminder_at::date=current_date) as today`, [v.id]))[0];
          return (<>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3>Claim-mailcampagne {on ? <span className="verified">Aan</span> : <span className="badge">Uit</span>}</h3>
              <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Mails gaan alleen naar bedrijven met een vooraf gebouwd profiel en een e-mailadres van hun website, op werkdagen tussen 8 en 18 uur, maximaal het dagquotum. Na 7 dagen één herinnering. Uitschrijven kan met één klik.</p>
              <div className="grid cols-4" style={{ gap: 10 }}>
                {[["Profielen gebouwd", c.built], ["Klaar om te mailen", c.with_email], ["Verstuurd", c.sent], ["Herinnerd", c.reminded], ["Vandaag", c.today], ["Geclaimd na mail", c.claimed], ["Uitgeschreven", c.optout]].map(([k, val]) => <div key={String(k)} className="card" style={{ padding: "10px 12px" }}><b style={{ fontSize: 22, fontFamily: "Manrope, sans-serif" }}>{val}</b><br /><small>{k}</small></div>)}
              </div>
              <form method="post" action="/admin/actie/" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <input type="hidden" name="actie" value="campagne" /><input type="hidden" name="id" value="-" />
                <label style={{ fontSize: 14, fontWeight: 600 }}>Per dag <input name="per_day" type="number" min={1} max={1000} defaultValue={perDay} style={{ width: 90, marginLeft: 6, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }} /></label>
                <button className={`btn ${on ? "btn-outline" : "btn-primary"}`} name="enabled" value={on ? "0" : "1"} type="submit">{on ? "Campagne pauzeren" : "Campagne starten"}</button>
              </form>
            </div>
            <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span><b>Weekoverzichtsmail</b> naar geverifieerde bedrijven (maandag: bezoekers, aanvragen, reviews). Nu: {(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "aan" : "uit"}.</span>
              <form method="post" action="/admin/actie/"><input type="hidden" name="actie" value="weekly" /><input type="hidden" name="id" value="-" /><button className="btn btn-outline" name="enabled" value={(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "0" : "1"} type="submit">{(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "Uitzetten" : "Aanzetten"}</button></form>
            </div>
            <div className="card"><h3 style={{ marginBottom: 8 }}>Zo ziet de mail eruit</h3><p style={{ fontSize: 15, color: "var(--ink-2)" }}>Onderwerp: "Jouw profiel op {v.brand} staat klaar, [bedrijfsnaam]". Tekst zoals goedgekeurd, met previewlink naar het eigen profiel, de regel over de plaats alleen als die klopt, en een uitschrijflink. De herinnering heeft "Nog even:" ervoor.</p></div>
          </>);
        })())}
        {tab === "stats" && (await (async () => {
          const days = await q<{ day: string; views: number; visitors: number }>("select day::text, sum(views)::int as views, sum(visitors)::int as visitors from page_views where day > current_date - 30 group by day order by day desc");
          const top = await q<{ path: string; views: number }>("select path, sum(views)::int as views from page_views where day > current_date - 30 group by path order by views desc limit 25");
          return (<>
            <div className="card"><h3 style={{ marginBottom: 8 }}>Laatste 30 dagen</h3>{days.length === 0 ? <p style={{ color: "var(--ink-2)" }}>Nog geen bezoeken geteld.</p> : <table style={{ fontSize: 14, borderCollapse: "collapse" }}><tbody>{days.map((d) => <tr key={d.day}><td style={{ padding: "3px 16px 3px 0" }}>{d.day}</td><td style={{ padding: "3px 16px 3px 0" }}>{d.views} weergaven</td><td>{d.visitors} bezoekers</td></tr>)}</tbody></table>}</div>
            <div className="card"><h3 style={{ marginBottom: 8 }}>Drukste pagina's</h3><table style={{ fontSize: 14, borderCollapse: "collapse" }}><tbody>{top.map((t) => <tr key={t.path}><td style={{ padding: "3px 16px 3px 0" }}><a href={t.path}>{t.path}</a></td><td>{t.views}</td></tr>)}</tbody></table></div>
          </>);
        })())}
        {tab === "test" && (<>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3>Testbedrijf aanmaken</h3>
            <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Maak een bedrijf aan met een website waarvan jij een e-mailadres hebt. Daarmee doorloop je de hele claim-flow: inloglink, profiel bouwen uit de website, dashboard, betalen. Het testbedrijf staat niet in de sitemap en krijgt noindex. Daarna kun je het hier weer verwijderen.</p>
            <form method="post" action="/admin/actie/" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
              <input type="hidden" name="actie" value="test_aanmaken" /><input type="hidden" name="id" value="-" />
              <label style={{ fontSize: 14, fontWeight: 600 }}>Bedrijfsnaam<input name="naam" required placeholder="YourFellow Dakwerken" style={{ display: "block", width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} /></label>
              <label style={{ fontSize: 14, fontWeight: 600 }}>Website<input name="website" required placeholder="yourfellow.nl" style={{ display: "block", width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} /></label>
              <label style={{ fontSize: 14, fontWeight: 600 }}>Plaats<input name="plaats" required placeholder="Zwolle" style={{ display: "block", width: "100%", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontFamily: "inherit", boxSizing: "border-box" }} /></label>
              <button className="btn btn-primary" type="submit" style={{ minHeight: 44 }}>Aanmaken</button>
            </form>
            <span className="srnote">"Zet terug als aangemaakte pagina" maakt het testbedrijf weer niet-geclaimd, met een vooraf gebouwd profiel en jouw e-mailadres als bedrijfsadres. Zo test je de teaser: vraag een offerte aan op de pagina, ontvang de teaser-mail, claim, en zie de aanvraag gemaskeerd tot er betaald is. De bedrijfsnaam moet op de website voorkomen (de controle zoekt minstens twee woorden uit de naam, zonder woorden als B.V. of Dakwerken). "YourFellow" op yourfellow.nl werkt dus.</span>
          </div>
          {(await q<{ id: string; name: string; slug: string; city: string | null; status: string; website: string | null }>("select id, name, slug, city, status, website from businesses where vertical_id=$1 and source='test' order by created_at desc", [v.id])).map((b) => (
            <Row key={b.id}><span><b><a href={`/bedrijf/${b.slug}/`}>{b.name}</a></b><br /><small>{b.city ?? ""}, {b.status}, {b.website}</small></span>
              <div className="actions"><Btn actie="test_reset" id={b.id} label="Zet terug als aangemaakte pagina" /><a href={`/claim/${b.slug}/`} className="btn btn-primary" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Claim-flow starten</a><a href={`/dashboard/${b.slug}/`} className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Dashboard</a><Btn actie="test_verwijderen" id={b.id} label="Verwijderen" /></div></Row>
          ))}
        </>)}
        {tab === "claims" && (claims.length === 0 ? <div className="card">Nog geen geclaimde profielen.</div> : claims.map((b) => (
          <Row key={b.id}><span><b><a href={`/bedrijf/${b.slug}/`}>{b.name}</a></b><br /><small>{b.city ?? ""}, {b.status === "unclaimed" ? "geclaimd, nog niet betaald" : b.status}{b.verified_at ? `, geverifieerd ${b.verified_at.slice(0, 10)}` : ""}{b.paid_until ? `, betaald tot ${b.paid_until}` : ""}{b.email ? `, ${b.email}` : ""}</small></span><a href={`/dashboard/${b.slug}/`} className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>Bekijken</a></Row>
        )))}
      </div>
    </main>
  );
}
