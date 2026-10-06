import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { one, q } from "@/lib/db";
import { SEGMENTS, segmentRows } from "@/lib/funnel";
import { getUser } from "@/lib/auth";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Beheer", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function Row({ children }: { children: React.ReactNode }) { return <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>{children}</div>; }
const Btn = ({ actie, id, label, kind = "btn-outline", extra }: { actie: string; id: string; label: string; kind?: string; extra?: Record<string, string> }) => (
  <form method="post" action="/admin/actie/" style={{ display: "inline" }}><input type="hidden" name="actie" value={actie} /><input type="hidden" name="id" value={id} />{extra && Object.entries(extra).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}<button className={`btn ${kind}`} style={{ padding: "8px 12px", minHeight: 38, fontSize: 14 }}>{label}</button></form>
);

export default async function Admin({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; ok?: string; seg?: string; regio?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/dashboard/");
  if (!user.is_admin) redirect("/dashboard/");
  const v = await currentVertical();
  const { tab = "dashboard", q: term = "", ok, seg = "warm", regio = "" } = await searchParams;

  const counts = (await q<{ reviews: number; verzoeken: number; betalingen: number; claims: number }>(`
    select (select count(*)::int from reviews where status='pending' and email_verified_at is not null) as reviews,
           (select count(*)::int from claims where method in ('correctie','verwijderverzoek') and verified_at is null) as verzoeken,
           (select count(*)::int from payments where (status='paid' and paid_at > now() - interval '30 days') or (provider='bank' and status='open')) as betalingen,
           (select count(*)::int from businesses where vertical_id=$1 and status in ('claimed','pro')) as claims`, [v.id]))[0];
  const tabs = [["dashboard", "Dashboard"], ["reviews", `Reviews (${counts.reviews})`], ["verzoeken", `Correcties (${counts.verzoeken})`], ["betalingen", `Betalingen (${counts.betalingen})`], ["bedrijven", "Bedrijven"], ["claims", `Geverifieerd (${counts.claims})`], ["test", "Testen"], ["campagne", "Campagne"], ["stats", "Bezoekers"]];

  const reviews = tab === "reviews" ? await q<{ id: string; name: string; score: number; body: string; service_slug: string | null; invoice_ref: string | null; created_at: string; business: string; slug: string }>(`
    select r.id, r.name, r.score, r.body, r.service_slug, r.invoice_ref, r.created_at::text, b.name as business, b.slug from reviews r join businesses b on b.id=r.business_id
    where r.status='pending' and r.email_verified_at is not null order by r.created_at`) : [];
  const verzoeken = tab === "verzoeken" ? await q<{ id: string; email: string; method: string; code: string | null; created_at: string; business: string; slug: string; bid: string }>(`
    select c.id, c.email, c.method, c.code, c.created_at::text, b.name as business, b.slug, b.id as bid from claims c join businesses b on b.id=c.business_id
    where c.method in ('correctie','verwijderverzoek') and c.verified_at is null order by c.created_at`) : [];
  const betalingen = tab === "betalingen" ? await q<{ id: string; amount_cents: number; status: string; paid_at: string | null; consumer_name: string | null; provider_id: string; provider: string; business: string; slug: string }>(`
    select p.id, p.amount_cents, p.status, p.paid_at::text, p.consumer_name, p.provider_id, p.provider, b.name as business, b.slug from payments p join businesses b on b.id=p.business_id order by p.created_at desc limit 100`) : [];
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
          <Row key={p.id}><span><b><a href={`/bedrijf/${p.slug}/`}>{p.business}</a></b><br /><small>{(p.amount_cents / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 })} euro, {p.provider === "bank" ? "bankoverschrijving" : "iDEAL"}, {p.status === "open" ? (p.provider === "bank" ? "wacht op ontvangst" : "open") : p.status}{p.paid_at ? `, betaald ${p.paid_at.slice(0, 10)}` : ""}{p.consumer_name ? `, ${p.consumer_name}` : ""}</small></span><span style={{ display: "flex", gap: 8, alignItems: "center" }}><small style={{ color: "var(--ink-3)" }}>{p.provider_id}</small>{p.provider === "bank" && p.status === "open" && <Btn actie="bank_ontvangen" id={p.id} label="Betaling ontvangen, zet online" kind="btn-primary" />}</span></Row>
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
          const perDay = (await one<{ value: string }>("select value from settings where key='outreach_per_day'"))?.value ?? "auto";
          const regions = (await one<{ value: string }>("select value from settings where key='outreach_regions'"))?.value ?? "";
          const regionList = regions.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
          const inRegion = (await one<{ n: number }>(`select count(*)::int as n from businesses b left join municipalities m on m.id=b.municipality_id left join provinces pr on pr.id=m.province_id
            where b.vertical_id=$1 and b.status='unclaimed' and b.owner_user_id is null and b.profile_built_at is not null and b.outreach_email is not null and not b.outreach_opt_out and b.source<>'test'
            and not exists (select 1 from outreach o where o.business_id=b.id) and (cardinality($2::text[])=0 or lower(pr.slug)=any($2) or lower(m.slug)=any($2) or lower(b.city)=any($2))`, [v.id, regionList]))?.n ?? 0;
          const checks: [string, boolean, string][] = [
            ["Mailsleutel (Resend)", !!process.env.RESEND_API_KEY, "RESEND_API_KEY in Coolify"],
            ["Afzender send.lokaledakdekkers.nl", !!process.env.RESEND_API_KEY, "domein geverifieerd in Resend"],
            ["Betalen: iDEAL (Mollie)", !!process.env.MOLLIE_API_KEY && !String(process.env.MOLLIE_API_KEY).startsWith("test_"), process.env.MOLLIE_API_KEY ? "nu alleen testsleutel" : "MOLLIE_API_KEY ontbreekt"],
            ["Betalen: bankoverschrijving", !!process.env.INVOICE_IBAN, "INVOICE_IBAN in Coolify"],
            ["Factuurgegevens", !!process.env.INVOICE_KVK && !!process.env.INVOICE_BTW && !!process.env.INVOICE_ADDRESS, "INVOICE_ADDRESS, INVOICE_KVK, INVOICE_BTW"],
            ["Profielbouwer (Anthropic)", !!process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"],
          ];
          const readyToSend = checks[0][1] && (checks[2][1] || checks[3][1]);
          const infoOn = (await one<{ value: string }>("select value from settings where key='outreach_info'"))?.value === "1";
          const lc = (await q<{ rp: number; nat: number; onb: number }>(`select count(*) filter (where b.legal_class='rechtspersoon')::int as rp, count(*) filter (where b.legal_class='natuurlijk')::int as nat, count(*) filter (where b.legal_class is null)::int as onb
            from businesses b left join municipalities m on m.id=b.municipality_id left join provinces pr on pr.id=m.province_id
            where b.vertical_id=$1 and b.status='unclaimed' and b.owner_user_id is null and b.profile_built_at is not null and b.outreach_email is not null and not b.outreach_opt_out and b.source<>'test'
            and not exists (select 1 from outreach o where o.business_id=b.id) and (cardinality($2::text[])=0 or lower(pr.slug)=any($2) or lower(m.slug)=any($2) or lower(b.city)=any($2))`, [v.id, regionList]))[0];
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
              <div className="card" style={{ display: "grid", gap: 6, background: "var(--ground)" }}>
                <b>Checklist</b>
                {checks.map(([k, ok, hint]) => <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 15 }}><span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", background: ok ? "var(--green)" : "var(--amber-ink)", fontSize: 13, flexShrink: 0 }}>{ok ? "✓" : "!"}</span><span>{k}{ok ? "" : <small style={{ color: "var(--ink-3)" }}>, {hint}</small>}</span></div>)}
                <small style={{ color: "var(--ink-3)", marginTop: 4 }}>{readyToSend ? "Klaar om te versturen: er is een werkend betaalpad." : "Nog niet versturen: zonder iDEAL of IBAN kan niemand betalen."}</small>
              </div>
              <form method="post" action="/admin/actie/" style={{ display: "grid", gap: 10 }}>
                <input type="hidden" name="actie" value="campagne" /><input type="hidden" name="id" value="-" />
                <label style={{ fontSize: 14, fontWeight: 600 }}>Regio's (provincie-, gemeente- of plaatsnamen, gescheiden door komma's; leeg is heel Nederland)<input name="regions" defaultValue={regions} placeholder="bijvoorbeeld: noord-brabant, overijssel of zevenbergen, hengelo, enschede" style={{ display: "block", width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 10px", marginTop: 4, fontFamily: "inherit", fontSize: 15 }} /><small style={{ color: "var(--ink-3)", fontWeight: 400 }}>{inRegion} mailbare bedrijven in deze selectie: {lc.rp} bv/nv (krijgen de claimmail), {lc.nat} eenmanszaak of vof (alleen informatiemail, als die aan staat), {lc.onb} rechtsvorm nog onbekend (worden overgeslagen tot bekend).</small></label>
                <label style={{ fontSize: 14, display: "flex", gap: 8, alignItems: "flex-start" }}><input type="checkbox" name="info" value="1" defaultChecked={infoOn} style={{ marginTop: 3 }} /> <span><b>Informatiemail aan eenmanszaken en vof's</b> versturen: zonder prijs of aanbod, alleen dat hun gegevens in de gids staan en hoe ze die kunnen bekijken, corrigeren of laten verwijderen (AVG artikel 14). Geen herinnering.</span></label>
                <label style={{ fontSize: 14, fontWeight: 600 }}>Per dag <select name="per_day" defaultValue={perDay} style={{ marginLeft: 6, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", fontFamily: "inherit" }}><option value="auto">Automatisch opbouwen: 50, na 3 dagen 100, na 7 dagen 200</option><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></select></label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn btn-outline" name="enabled" value={on ? "1" : "0"} type="submit">Instellingen opslaan</button>
                  <button className={`btn ${on ? "btn-outline" : "btn-primary"}`} name="enabled" value={on ? "0" : "1"} type="submit">{on ? "Campagne pauzeren" : "Campagne starten"}</button>
                </div>
              </form>
              <form method="post" action="/admin/actie/" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <input type="hidden" name="actie" value="testmail" /><input type="hidden" name="id" value="-" />
                <span style={{ fontSize: 14 }}>Stuur een testmail van een willekeurig bedrijf naar <b>{user.email}</b>:</span>
                <button className="btn btn-outline" type="submit" name="variant" value="claim">Test claimmail (bv)</button>
                <button className="btn btn-outline" type="submit" name="variant" value="info">Test informatiemail (eenmanszaak)</button>
              </form>
            </div>
            <div className="card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span><b>Weekoverzichtsmail</b> naar geverifieerde bedrijven (maandag: bezoekers, aanvragen, reviews). Nu: {(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "aan" : "uit"}.</span>
              <form method="post" action="/admin/actie/"><input type="hidden" name="actie" value="weekly" /><input type="hidden" name="id" value="-" /><button className="btn btn-outline" name="enabled" value={(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "0" : "1"} type="submit">{(await one<{ value: string }>("select value from settings where key='weekly_enabled'"))?.value === "1" ? "Uitzetten" : "Aanzetten"}</button></form>
            </div>
            <div className="card"><h3 style={{ marginBottom: 8 }}>Zo ziet de mail eruit</h3><p style={{ fontSize: 15, color: "var(--ink-2)" }}>Onderwerp: "Jouw profiel op {v.brand} staat klaar, [bedrijfsnaam]". Tekst zoals goedgekeurd, met previewlink naar het eigen profiel, de regel over de plaats alleen als die klopt, en een uitschrijflink. De herinnering heeft "Nog even:" ervoor.</p></div>
          </>);
        })())}
        {tab === "dashboard" && (await (async () => {
          const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
          const t = (await q<{ mailbaar: number; verstuurd: number; herinnerd: number; geopend: number; geklikt: number; geclaimd: number; betaald: number; omzet: number; uitgeschreven: number; aanvragen: number; bank: number }>(`
            select (select count(*)::int from businesses where vertical_id=$1 and source<>'test' and profile_built_at is not null and outreach_email is not null and not outreach_opt_out) as mailbaar,
              (select count(*)::int from outreach) as verstuurd, (select count(*)::int from outreach where reminder_at is not null) as herinnerd,
              (select count(*)::int from outreach where opened_at is not null) as geopend, (select count(*)::int from outreach where clicked_at is not null) as geklikt,
              (select count(*)::int from businesses where vertical_id=$1 and source<>'test' and owner_user_id is not null) as geclaimd,
              (select count(*)::int from businesses where vertical_id=$1 and source<>'test' and status in ('claimed','pro')) as betaald,
              coalesce((select sum(amount_cents)::int from payments p join businesses b on b.id=p.business_id where p.status='paid' and b.source<>'test'),0) as omzet,
              (select count(*)::int from businesses where vertical_id=$1 and outreach_opt_out) as uitgeschreven,
              (select count(*)::int from lead_requests) as aanvragen,
              (select count(*)::int from payments where provider='bank' and status='open') as bank`, [v.id]))[0];
          const pct = (a: number, b: number) => b ? `${Math.round((a / b) * 1000) / 10}%` : "0%";
          const eur = (c: number) => (c / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const days = await q<{ d: string; sent: number; opened: number; clicked: number; claimed: number; paid: number }>(`
            with d as (select generate_series(current_date - 13, current_date, interval '1 day')::date as d)
            select d.d::text,
              (select count(*)::int from outreach where sent_at::date=d.d) as sent, (select count(*)::int from outreach where opened_at::date=d.d) as opened,
              (select count(*)::int from outreach where clicked_at::date=d.d) as clicked,
              (select count(*)::int from businesses where vertical_id=$1 and source<>'test' and owner_user_id is not null and verified_at::date=d.d) as claimed,
              (select count(*)::int from payments p join businesses b on b.id=p.business_id where p.status='paid' and b.source<>'test' and p.paid_at::date=d.d) as paid
            from d order by d.d desc`, [v.id]);
          const prov = await q<{ slug: string; name: string; mailbaar: number; verstuurd: number; geklikt: number; geclaimd: number; betaald: number }>(`
            select pr.slug, pr.name,
              count(*) filter (where b.profile_built_at is not null and b.outreach_email is not null and not b.outreach_opt_out)::int as mailbaar,
              count(o.id)::int as verstuurd, count(o.clicked_at)::int as geklikt,
              count(*) filter (where b.owner_user_id is not null)::int as geclaimd, count(*) filter (where b.status in ('claimed','pro'))::int as betaald
            from businesses b join municipalities m on m.id=b.municipality_id join provinces pr on pr.id=m.province_id left join outreach o on o.business_id=b.id
            where b.vertical_id=$1 and b.source<>'test' group by pr.slug, pr.name order by betaald desc, geklikt desc, pr.name`, [v.id]);
          const rows = await segmentRows(v.id, seg, regio, 200);
          const funnel: [string, number, string][] = [["Mailbaar", t.mailbaar, ""], ["Verstuurd", t.verstuurd, pct(t.verstuurd, t.mailbaar) + " van mailbaar"], ["Geopend", t.geopend, pct(t.geopend, t.verstuurd) + " van verstuurd"], ["Geklikt", t.geklikt, pct(t.geklikt, t.verstuurd) + " van verstuurd"], ["Geclaimd", t.geclaimd, pct(t.geclaimd, t.verstuurd) + " van verstuurd"], ["Betaald", t.betaald, pct(t.betaald, t.geclaimd) + " van geclaimd"]];
          const max = Math.max(1, t.mailbaar, t.verstuurd);
          const cell: React.CSSProperties = { padding: "6px 10px", borderBottom: "1px solid var(--line)", textAlign: "right" };
          return (<>
            <div className="grid cols-4" style={{ gap: 10 }}>
              {[["Betalende bedrijven", String(t.betaald)], ["Omzet totaal", `${eur(t.omzet)} euro`], ["Jaaromzet nu (ARR)", `${eur(t.betaald * price)} euro`], ["Offerteaanvragen", String(t.aanvragen)], ["Geclaimd, onbetaald", String(Math.max(0, t.geclaimd - t.betaald))], ["Overschrijving open", String(t.bank)], ["Herinneringen verstuurd", String(t.herinnerd)], ["Uitgeschreven", String(t.uitgeschreven)]].map(([k, val]) => <div key={k} className="card" style={{ padding: "12px 14px" }}><b style={{ fontSize: 24, fontFamily: "Manrope, sans-serif" }}>{val}</b><br /><small>{k}</small></div>)}
            </div>
            <div className="card" style={{ display: "grid", gap: 8 }}>
              <h3>Funnel</h3>
              {funnel.map(([k, n, sub]) => <div key={k} style={{ display: "grid", gridTemplateColumns: "120px 1fr 160px", gap: 10, alignItems: "center", fontSize: 14 }}><b>{k}</b><span style={{ background: "var(--chip)", borderRadius: 6, height: 22, position: "relative" }}><span style={{ position: "absolute", inset: 0, width: `${Math.max(1, (n / max) * 100)}%`, background: k === "Betaald" ? "var(--green)" : "var(--navy)", borderRadius: 6 }} /></span><span>{n.toLocaleString("nl-NL")} <small style={{ color: "var(--ink-3)" }}>{sub}</small></span></div>)}
              <small style={{ color: "var(--ink-3)" }}>Geopend is een ondergrens of overschatting: sommige mailprogramma's laden geen afbeeldingen, Apple Mail laadt ze altijd. Kliks en claims zijn exact.</small>
            </div>
            <div className="card" style={{ overflowX: "auto" }}>
              <h3 style={{ marginBottom: 8 }}>Laatste 14 dagen</h3>
              <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}><thead><tr>{["Dag", "Verstuurd", "Geopend", "Geklikt", "Geclaimd", "Betaald"].map((h) => <th key={h} style={{ ...cell, textAlign: h === "Dag" ? "left" : "right" }}>{h}</th>)}</tr></thead>
                <tbody>{days.map((d) => <tr key={d.d}><td style={{ ...cell, textAlign: "left" }}>{new Date(d.d).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}</td><td style={cell}>{d.sent}</td><td style={cell}>{d.opened}</td><td style={cell}>{d.clicked}</td><td style={cell}>{d.claimed}</td><td style={cell}>{d.paid}</td></tr>)}</tbody></table>
            </div>
            <div className="card" style={{ overflowX: "auto" }}>
              <h3 style={{ marginBottom: 8 }}>Per provincie</h3>
              <table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}><thead><tr>{["Provincie", "Mailbaar", "Verstuurd", "Geklikt", "Geclaimd", "Betaald"].map((h) => <th key={h} style={{ ...cell, textAlign: h === "Provincie" ? "left" : "right" }}>{h}</th>)}</tr></thead>
                <tbody>{prov.map((p) => <tr key={p.slug}><td style={{ ...cell, textAlign: "left" }}><a href={`/admin/?tab=dashboard&seg=${seg}&regio=${p.slug}`}>{p.name}</a></td><td style={cell}>{p.mailbaar}</td><td style={cell}>{p.verstuurd}</td><td style={cell}>{p.geklikt}</td><td style={cell}>{p.geclaimd}</td><td style={cell}>{p.betaald}</td></tr>)}</tbody></table>
            </div>
            <div className="card" style={{ display: "grid", gap: 10 }}>
              <h3>Bedrijven per fase{regio ? `, ${prov.find((p) => p.slug === regio)?.name ?? regio}` : ""}</h3>
              <div className="chips">{SEGMENTS.map(([k, label]) => <a key={k} href={`/admin/?tab=dashboard&seg=${k}${regio ? `&regio=${regio}` : ""}`} className={`pill${seg === k ? " on" : ""}`} style={{ fontSize: 13 }}>{label}</a>)}{regio && <a href={`/admin/?tab=dashboard&seg=${seg}`} className="pill" style={{ fontSize: 13 }}>Alle provincies</a>}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}><small>{rows.length}{rows.length === 200 ? "+" : ""} bedrijven</small><a href={`/admin/export/?seg=${seg}${regio ? `&regio=${regio}` : ""}`} className="btn btn-outline" style={{ padding: "6px 12px", minHeight: 36, fontSize: 14 }}>Download als bellijst (CSV)</a></div>
              <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", fontSize: 14, width: "100%" }}><thead><tr>{["Bedrijf", "Plaats", "Telefoon", "E-mail", "Verstuurd", "Geopend", "Geklikt", "Status", "Aanvragen"].map((h) => <th key={h} style={{ ...cell, textAlign: "left" }}>{h}</th>)}</tr></thead>
                <tbody>{rows.map((r) => <tr key={r.id}><td style={{ ...cell, textAlign: "left" }}><a href={`/bedrijf/${r.slug}/`}>{r.name}</a></td><td style={{ ...cell, textAlign: "left" }}>{r.city}</td><td style={{ ...cell, textAlign: "left", whiteSpace: "nowrap" }}>{r.phone ? <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a> : ""}</td><td style={{ ...cell, textAlign: "left" }}>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : ""}</td><td style={{ ...cell, textAlign: "left" }}>{r.sent_at?.slice(5, 10) ?? ""}</td><td style={{ ...cell, textAlign: "left" }}>{r.opened_at?.slice(5, 10) ?? ""}</td><td style={{ ...cell, textAlign: "left" }}>{r.clicked_at?.slice(5, 10) ?? ""}</td><td style={{ ...cell, textAlign: "left" }}>{r.status === "claimed" || r.status === "pro" ? `Betaald tot ${r.paid_until ?? ""}` : r.claimed ? "Geclaimd" : "Niet geclaimd"}</td><td style={cell}>{r.leads}</td></tr>)}</tbody></table></div>
            </div>
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
