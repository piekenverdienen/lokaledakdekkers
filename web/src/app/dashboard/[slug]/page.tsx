import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBusiness, q, one } from "@/lib/db";
import { mollieEnabled } from "@/lib/mollie";
import { getUser } from "@/lib/auth";
import { currentVertical, cap, serviceName, websiteDomainSafe } from "@/lib/site";
import { initials } from "@/components/BusinessCard";

export const metadata: Metadata = { title: "Profiel bewerken", robots: { index: false, follow: false } };

const Pencil = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };

function Block({ title, slug, field, children, form }: { title: string; slug: string; field: string; children: React.ReactNode; form: React.ReactNode }) {
  return (
    <details className="card" style={{ padding: 0 }}>
      <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "16px 20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}><h3>{title}</h3>{children}</div>
        <span className="btn btn-outline" style={{ padding: "8px 12px", minHeight: 40, color: "var(--blue)" }} aria-label={`${title} bewerken`}><Pencil /></span>
      </summary>
      <form method="post" action={`/dashboard/${slug}/save/`} style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        <input type="hidden" name="block" value={field} />
        {form}
        <div className="actions"><button className="btn btn-primary" type="submit">Opslaan</button></div>
      </form>
    </details>
  );
}

export default async function Edit({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welkom?: string; gebouwd?: string; fout?: string; betaald?: string }> }) {
  const v = await currentVertical();
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/dashboard/");
  const b = await getBusiness(slug, v.id);
  if (!b) notFound();
  const owner = await q<{ owner_user_id: string | null; website: string | null; available_from: string | null }>("select owner_user_id, website, available_from::text from businesses where id=$1", [b.id]);
  if (!user.is_admin && owner[0]?.owner_user_id !== user.id) redirect("/dashboard/");
  const photos = await q<{ id: string; url: string }>("select id, url from business_photos where business_id=$1 order by sort_order", [b.id]);
  const areas = await q<{ name: string }>("select p.name from business_areas a join places p on p.id=a.place_id where a.business_id=$1 order by p.name", [b.id]);
  const live = b.status !== "unclaimed";
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const paidUntil = (await one<{ d: string | null }>("select paid_until::text as d from businesses where id=$1", [b.id]))?.d ?? null;
  const priceText = (price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const site = owner[0]?.website ?? "";

  return (
    <main className="wrap" style={{ padding: "24px 24px 64px" }}>
      <nav className="crumbs"><a href="/dashboard/">Jouw bedrijven</a><span>/</span><b>{b.name}</b></nav>
      {sp.welkom && (
        <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)", marginBottom: 16 }}>
          <b>Gelukt, {b.name} is van jou.</b> Laat nu je profiel opbouwen uit je website, controleer het en zet het live. Niets staat online voordat je op Zet live klikt.
        </div>
      )}
      {sp.gebouwd && <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)", marginBottom: 16 }}><b>Profiel opgebouwd uit {websiteDomainSafe(site)}</b> ({sp.gebouwd} pagina's gelezen). Klopt er iets niet? Klik op het potlood bij dat blok.</div>}
      {sp.betaald && !live && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginBottom: 16 }}>Bedankt. Zodra de betaling bevestigd is (meestal binnen een minuut) staat je profiel online. Ververs deze pagina.</div>}
      {sp.betaald && live && <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)", marginBottom: 16 }}><b>Je profiel staat online en is geverifieerd.</b> Geldig tot {paidUntil}.</div>}
      {sp.fout === "betalen" && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginBottom: 16 }}>Betalen is tijdelijk niet mogelijk. Probeer het later opnieuw.</div>}
      {sp.fout === "site" && <div className="card" style={{ borderColor: "var(--amber)", background: "var(--amber-bg)", marginBottom: 16 }}>De website kon niet gelezen worden. Controleer het adres hieronder, of vul de blokken zelf in.</div>}

      <div className="layout" style={{ paddingTop: 0 }}>
        <div className="main">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <h1 style={{ fontSize: 30 }}>{b.name}</h1>
            <span className={live ? "verified" : "badge"}>{live ? "Live, geverifieerd" : "Nog niet live"}</span>
          </div>

          <form method="post" action={`/dashboard/${slug}/bouw/`} className="card" style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--map)", borderColor: "#9FBED3" }}>
            <h3>Profiel opbouwen uit je website</h3>
            <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Wij lezen je website en vullen beschrijving, diensten, werkgebied, keurmerken en foto's in. Duurt een halve minuut. Bestaande tekst wordt overschreven.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input name="website" defaultValue={site} placeholder="https://www.jouwbedrijf.nl" style={{ ...input, flex: "1 1 240px", width: "auto" }} />
              <button className="btn btn-primary" type="submit">{b.description ? "Opnieuw opbouwen" : "Bouw mijn profiel"}</button>
            </div>
          </form>

          <Block title="Bedrijfsgegevens" slug={slug} field="contact" form={<>
            <label>Telefoon<input name="phone" defaultValue={b.phone ?? ""} style={input} /></label>
            <label>WhatsApp (06-nummer)<input name="whatsapp" defaultValue={b.whatsapp ?? ""} style={input} /></label>
            <label>E-mail<input name="email" defaultValue={b.email ?? ""} style={input} /></label>
            <label>Website<input name="website" defaultValue={site} style={input} /></label>
            <label>Opgericht in<input name="founded_year" defaultValue={b.founded_year ?? ""} style={input} inputMode="numeric" /></label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="emergency" defaultChecked={b.emergency} /> Spoedreparaties bij lekkage of stormschade</label>
          </>}>
            <span className="meta"><span>{b.phone ?? "geen telefoon"}</span><span>{b.email ?? "geen e-mail"}</span><span>{websiteDomainSafe(site) || "geen website"}</span>{b.emergency && <span className="spoed">Spoed</span>}</span>
          </Block>

          <Block title="Over ons" slug={slug} field="description" form={<textarea name="description" defaultValue={b.description ?? ""} rows={6} style={{ ...input, minHeight: 140 }} placeholder="80 tot 150 woorden over je bedrijf, in de derde persoon." />}>
            <p style={{ color: "var(--ink-2)" }}>{b.description ?? "Nog geen beschrijving. Bouw je profiel uit je website of schrijf hem zelf."}</p>
          </Block>

          <Block title="Diensten" slug={slug} field="services" form={<div className="chips">{v.services.map((s) => (
            <label key={s.slug} className="pill" style={{ gap: 6 }}><input type="checkbox" name="services" value={s.slug} defaultChecked={b.services.includes(s.slug)} /> {s.name}</label>
          ))}</div>}>
            <div className="chips">{b.services.length ? b.services.map((s) => <span key={s} className="chip">{serviceName(v, s)}</span>) : <span style={{ color: "var(--ink-3)" }}>Nog geen diensten gekozen.</span>}</div>
          </Block>

          <Block title="Werkgebied" slug={slug} field="area" form={<>
            <label>Plaatsen, gescheiden door komma's<textarea name="area" defaultValue={areas.map((a) => a.name).join(", ")} rows={3} style={{ ...input, minHeight: 80 }} /></label>
            <span className="srnote">Gratis: alleen je eigen plaats telt. Met Pro sta je bovenaan in al deze plaatsen (tot 40 plaatsen of 50 km).</span>
          </>}>
            <p style={{ color: "var(--ink-2)" }}>{areas.length ? areas.map((a) => a.name).join(", ") : `Alleen ${b.city ?? "je eigen plaats"}.`}</p>
          </Block>

          <Block title="Keurmerken en pluspunten" slug={slug} field="extras" form={<>
            <label>Keurmerken, gescheiden door komma's<input name="certifications" defaultValue={b.certifications.join(", ")} style={input} placeholder="VEBIDAK, Dakmeester, VCA" /></label>
            <label>Pluspunten, één per regel (maximaal 4)<textarea name="usps" defaultValue={b.usps.join("\n")} rows={4} style={{ ...input, minHeight: 100 }} /></label>
          </>}>
            <div className="chips">{b.certifications.map((c) => <span key={c} className="chip">{c}</span>)}{b.usps.map((u) => <span key={u} className="chip" style={{ background: "var(--green-bg)" }}>{u}</span>)}{!b.certifications.length && !b.usps.length && <span style={{ color: "var(--ink-3)" }}>Nog niets ingevuld.</span>}</div>
          </Block>

          <Block title={`Foto's (${photos.length})`} slug={slug} field="photos" form={<>
            <label>Foto-adressen, één per regel (maximaal {b.status === "pro" ? 30 : 6})<textarea name="photos" defaultValue={photos.map((p) => p.url).join("\n")} rows={6} style={{ ...input, minHeight: 120 }} /></label>
            <label>Logo-adres<input name="logo_url" defaultValue={b.logo_url ?? ""} style={input} /></label>
            <span className="srnote">Uploaden vanaf je telefoon komt in een volgende ronde; nu kun je adressen van foto's op je eigen website gebruiken.</span>
          </>}>
            {photos.length ? <div className="photos">{photos.slice(0, 4).map((p) => <img key={p.id} src={p.url} alt="" />)}</div> : <span style={{ color: "var(--ink-3)" }}>Nog geen foto's.</span>}
          </Block>
        </div>

        <aside className="aside">
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3>{live ? "Je profiel is online en geverifieerd" : "Klaar? Zet je profiel online"}</h3>
            {live ? (
              <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Geldig tot {paidUntil ?? "onbekend"}. Wijzigingen die je opslaat staan direct op de site.</p>
            ) : (
              <>
                <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Voor {priceText} euro per jaar (iDEAL) gaat je profiel online met het label Geverifieerd, logo en foto's, een link naar je website, reviews met factuurbewijs en een offerteblok. Je staat dan boven de niet-geclaimde bedrijven.</p>
                <form method="post" action={`/dashboard/${slug}/betaal/`}><button className="btn btn-primary" type="submit" disabled={!mollieEnabled()} style={{ width: "100%", fontSize: 17, minHeight: 52 }}>Betaal {priceText} euro en zet online</button></form>
                {!mollieEnabled() && <span className="srnote">Betalen wordt binnenkort geactiveerd. Je profiel blijft bewaard.</span>}
              </>
            )}
            <a href={`/bedrijf/${slug}/`} className="btn btn-outline" style={{ justifyContent: "center" }}>{live ? "Bekijk je profiel" : "Bekijk voorbeeld"}</a>
          </div>
          <div style={{ background: "var(--amber-bg)", border: "1px solid var(--amber-light)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ color: "var(--amber-ink)" }}>Pro, 14 dagen gratis</b>
            <p style={{ fontSize: 15, color: "var(--ink-2)" }}>Daarna: bovenaan in je hele werkgebied, badge Aanbevolen, offerteaanvragen uit de plaatspagina, WhatsApp-knop, 30 foto's. {(v.pro_price_month_cents / 100).toLocaleString("nl-NL")} euro per maand. Beschikbaar in de volgende ronde.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
