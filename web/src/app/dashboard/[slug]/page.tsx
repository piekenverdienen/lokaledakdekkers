import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBusiness, q, one } from "@/lib/db";
import { mollieEnabled } from "@/lib/mollie";
import UploadForm from "@/components/UploadForm";
import ShareBlock from "@/components/ShareBlock";
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

export default async function Edit({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ welkom?: string; gebouwd?: string; fout?: string; betaald?: string; fotos?: string; overgeslagen?: string; logo?: string; uitnodigingen?: string; bank?: string }> }) {
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
  const maxPhotos = b.status === "pro" ? 30 : 6;
  const aanvragen = await q<{ id: string; status: string; viewed_at: string | null; name: string; phone: string; email: string | null; service_slug: string | null; description: string | null; wanted_when: string | null; address: string | null; size_m2: number | null; roof_type: string | null; contact_pref: string | null; photo_urls: string[]; created_at: string }>(`
    select l.id, l.status, l.viewed_at::text, r.name, r.phone, r.email, r.service_slug, r.description, r.wanted_when, r.address, r.size_m2, r.roof_type, r.contact_pref, r.photo_urls, r.created_at::text
    from leads l join lead_requests r on r.id=l.request_id where l.business_id=$1 order by r.created_at desc limit 50`, [b.id]);
  const views = (await one<{ total: number; month: number }>("select b.views_total as total, coalesce((select sum(views)::int from page_views pv where pv.business_id=b.id and pv.day > current_date - 30),0) as month from businesses b where b.id=$1", [b.id])) ?? { total: 0, month: 0 };
  const myReviews = await q<{ id: string; name: string; score: number; body: string; reply: string | null; created_at: string }>("select id, name, score, body, reply, created_at::text from reviews where business_id=$1 and status='published' order by created_at desc limit 20", [b.id]);
  const avail = (await one<{ availability: string; available_from: string | null }>("select availability, available_from from businesses where id=$1", [b.id])) ?? { availability: "available", available_from: null };
  const WHEN: Record<string, string> = { spoed: "Spoed", "2weken": "Binnen 2 weken", "3maanden": "Binnen 3 maanden", orienterend: "Oriënterend" };
  const areas = await q<{ name: string }>("select p.name from business_areas a join places p on p.id=a.place_id where a.business_id=$1 order by p.name", [b.id]);
  const live = b.status !== "unclaimed";
  const price = (await one<{ p: number }>("select verified_price_year_cents as p from verticals where id=$1", [v.id]))?.p ?? 7995;
  const paidUntil = (await one<{ d: string | null }>("select paid_until::text as d from businesses where id=$1", [b.id]))?.d ?? null;
  const priceText = (price / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2 });
  const iban = process.env.INVOICE_IBAN ?? ""; const seller = process.env.INVOICE_SELLER ?? "Rovimed Group B.V.";
  const bankOpen = await one<{ provider_id: string; created_at: string }>("select provider_id, created_at::text from payments where business_id=$1 and provider='bank' and status='open'", [b.id]);
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

          {live && (
            <section id="reviews" className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontSize: 18 }}>Reviews ({myReviews.length})</h2>
              {sp.uitnodigingen && <span className="srnote" style={{ color: "var(--green)" }}>{sp.uitnodigingen} uitnodigingen verstuurd.</span>}
              <form method="post" action={`/dashboard/${slug}/reviews/`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 15 }}>Vraag reviews aan je klanten<textarea name="emails" rows={2} placeholder="E-mailadressen van recente klanten, maximaal 5 per keer, gescheiden door komma of enter" style={{ ...input, minHeight: 60 }} /></label>
                <input name="note" placeholder="Optioneel: een persoonlijke regel, bijvoorbeeld: Bedankt voor het vertrouwen bij het nieuwe dak in maart" style={input} />
                <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>Uitnodigingen sturen</button>
                <span className="srnote">Ze krijgen een korte mail met een link naar je reviewpagina. Met factuurnummer krijgt hun review het label Geverifieerde klus.</span>
              </form>
              {myReviews.map((r) => (
                <div key={r.id} className="review">
                  <div className="meta"><span className="stars">{"★".repeat(r.score)}{"☆".repeat(5 - r.score)}</span><b>{r.name}</b><span>{r.created_at.slice(0, 10)}</span></div>
                  <p style={{ color: "var(--ink-2)", margin: 0 }}>{r.body}</p>
                  <form method="post" action={`/dashboard/${slug}/reageer/`} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <input type="hidden" name="review" value={r.id} />
                    <textarea name="reply" rows={2} defaultValue={r.reply ?? ""} placeholder="Reageer op deze review (zichtbaar op je profiel)" style={{ ...input, minHeight: 50, flex: "1 1 280px" }} />
                    <button className="btn btn-outline" type="submit" style={{ minHeight: 44 }}>{r.reply ? "Reactie aanpassen" : "Reageren"}</button>
                  </form>
                </div>
              ))}
            </section>
          )}

          {live && (
            <section id="beschikbaar" className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Beschikbaarheid</h2>
              <form method="post" action={`/dashboard/${slug}/beschikbaar/`} style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <select name="availability" defaultValue={avail.availability} style={{ ...input, width: "auto" }}><option value="available">Direct beschikbaar</option><option value="from">Beschikbaar vanaf</option><option value="full">Vol, geen nieuwe aanvragen</option></select>
                <input name="available_from" defaultValue={avail.available_from ?? ""} placeholder="bijvoorbeeld december 2026" style={{ ...input, width: 220 }} />
                <button className="btn btn-outline" type="submit">Opslaan</button>
              </form>
              <span className="srnote">Bij "vol" verdwijnt het offerteformulier tijdelijk van je profiel; je blijft wel zichtbaar en geverifieerd.</span>
            </section>
          )}

          {live && (
            <section id="badge" className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Badge voor je eigen website</h2>
              <img src={`/badge/${slug}/`} alt="Geverifieerd bedrijf op Lokale Dakdekkers" width={240} height={64} style={{ display: "block" }} />
              <textarea readOnly rows={3} value={`<a href="https://${v.domain}/bedrijf/${slug}/" title="${b.name} is een geverifieerd bedrijf op ${v.brand}"><img src="https://${v.domain}/badge/${slug}/" alt="Geverifieerd bedrijf op ${v.brand}" width="240" height="64"></a>`} style={{ ...input, minHeight: 80, fontFamily: "monospace", fontSize: 13 }} />
              <span className="srnote">Plak deze code in de footer van je website, of stuur hem naar je websitebouwer. Bezoekers van je site zien dat je gecontroleerd bent en kunnen je profiel bekijken.</span>
            </section>
          )}

          {live && (
            <section id="delen" className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>Deel dat je geverifieerd bent</h2>
              <p style={{ color: "var(--ink-2)", fontSize: 15, margin: 0 }}>Laat klanten en collega's zien dat je bedrijf gecontroleerd is. Eén klik en het staat op je eigen kanalen, met je naam en logo in de afbeelding.</p>
              <ShareBlock url={`https://${v.domain}/bedrijf/${slug}/`} text={`${b.name} is een geverifieerd ${v.name_singular}sbedrijf op ${v.domain}. Bekijk ons profiel met foto's van ons werk, reviews en direct een offerte aanvragen:`} image={`/og/${slug}/`} />
            </section>
          )}

          <section id="aanvragen" className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ fontSize: 18 }}>Offerteaanvragen ({aanvragen.length})</h2>
            {views.total > 0 && <p style={{ color: "var(--ink-2)", fontSize: 15, margin: 0 }}>Je profiel is {views.total.toLocaleString("nl-NL")} keer bekeken{views.month ? `, ${views.month} keer in de laatste 30 dagen` : ""}.</p>}
            {aanvragen.length === 0 && <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Nog geen aanvragen. Zodra je profiel online staat, kunnen bezoekers hier rechtstreeks een offerte aanvragen; die komt per mail binnen en staat ook hier.</p>}
            {aanvragen.map((a) => (
              <a key={a.id} href={`/dashboard/${slug}/aanvraag/${a.id}/`} className="card card-link" style={{ padding: "12px 14px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, borderColor: a.viewed_at ? "var(--line)" : "var(--amber)" }}>
                <span>
                  <b>{a.name}</b>{!a.viewed_at && <span className="badge" style={{ marginLeft: 8, background: "var(--amber-bg)", color: "var(--amber-ink)", borderColor: "var(--amber)" }}>Nieuw</span>}{a.wanted_when === "spoed" && <span className="badge badge-spoed" style={{ marginLeft: 8 }}>Spoed</span>}<br />
                  <small>{v.services.find((s) => s.slug === a.service_slug)?.name ?? "Onbekend"}{a.size_m2 ? `, ca. ${a.size_m2} m2` : ""}{a.address ? `, ${a.address.split(",").pop()?.trim()}` : ""}, {new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</small>
                </span>
                <span className="pill" style={{ fontSize: 13 }}>{({ new: "Nieuw", contacted: "Contact gehad", quoted: "Offerte gestuurd", won: "Opdracht", lost: "Niet doorgegaan" } as Record<string, string>)[a.status] ?? a.status}</span>
              </a>
            ))}
          </section>

          <section id="fotos" className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 18 }}>Foto's van je werk ({photos.length} van {maxPhotos})</h2>
              {sp.fotos && <span className="srnote" style={{ color: "var(--green)" }}>{sp.fotos} foto's toegevoegd{sp.overgeslagen ? `, ${sp.overgeslagen} overgeslagen` : ""}</span>}
            </div>
            {photos.length > 0 && (
              <div className="photos" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
                {photos.map((p, i) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <img src={p.url} alt="" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, display: "block" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {i > 0 && <form method="post" action={`/dashboard/${slug}/foto/`}><input type="hidden" name="actie" value="eerst" /><input type="hidden" name="url" value={p.url} /><button className="btn btn-outline" style={{ padding: "4px 10px", minHeight: 30, fontSize: 13 }}>Als eerste</button></form>}
                      <form method="post" action={`/dashboard/${slug}/foto/`}><input type="hidden" name="actie" value="verwijder" /><input type="hidden" name="url" value={p.url} /><button className="btn btn-outline" style={{ padding: "4px 10px", minHeight: 30, fontSize: 13 }} aria-label="Foto verwijderen">✕ Verwijder</button></form>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {photos.length < maxPhotos && (
              <UploadForm action={`/dashboard/${slug}/upload/`} kind="photo" multiple label="Foto's kiezen of maken" note={`Vanaf je telefoon kun je direct een foto maken. Maximaal ${maxPhotos} foto's, we verkleinen ze zelf.`} />
            )}
            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 12, border: "1px solid var(--line)", display: "grid", placeItems: "center", overflow: "hidden", background: "#fff" }}>{b.logo_url ? <img src={b.logo_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Geen logo</span>}</div>
              <UploadForm action={`/dashboard/${slug}/upload/`} kind="logo" label={b.logo_url ? "Ander logo kiezen" : "Logo kiezen"} />
              {b.logo_url && <form method="post" action={`/dashboard/${slug}/foto/`}><input type="hidden" name="actie" value="logo_weg" /><button className="btn btn-outline" style={{ padding: "6px 10px", minHeight: 34, fontSize: 13 }}>✕ Logo verwijderen</button></form>}
            </div>
          </section>
        </div>

        <aside className="aside">
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3>{live ? "Je profiel is online en geverifieerd" : "Klaar? Zet je profiel online"}</h3>
            {live ? (
              <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Geldig tot {paidUntil ?? "onbekend"}. Wijzigingen die je opslaat staan direct op de site.</p>
            ) : (
              <>
                <p style={{ color: "var(--ink-2)", fontSize: 15 }}>Je profiel gaat online met het label Geverifieerd, je logo en foto's, een link naar je website en een offerteblok. Je staat boven de niet-geclaimde bedrijven.</p>
                <p style={{ fontSize: 15 }}><b>{priceText} euro per jaar</b> <span style={{ color: "var(--ink-2)" }}>inclusief btw, via iDEAL. Geen incasso, geen stilzwijgende verlenging.</span></p>
                <span className="srnote" style={{ display: "block" }}>Met betalen ga je akkoord met de <a href="/voorwaarden/" target="_blank">voorwaarden</a>.</span>
                {mollieEnabled() && <form method="post" action={`/dashboard/${slug}/betaal/`}><button className="btn btn-primary" type="submit" style={{ width: "100%", fontSize: 17, minHeight: 52 }}>Betaal {priceText} euro via iDEAL</button></form>}
                {iban && (bankOpen ? (
                  <div style={{ borderRadius: 10, padding: "12px 14px", background: "var(--green-bg)", border: "1px solid var(--green)", fontSize: 15 }}><b>Overschrijving gemeld.</b> Zodra {priceText} euro met kenmerk <b>{bankOpen.provider_id}</b> op onze rekening staat, zetten we je profiel online en krijg je de factuur. Meestal binnen één werkdag.</div>
                ) : (
                  <details className="card" style={{ padding: "12px 14px", fontSize: 15 }} open={!mollieEnabled()}>
                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>{mollieEnabled() ? "Liever per bankoverschrijving?" : "Betalen per bankoverschrijving"}</summary>
                    <p style={{ color: "var(--ink-2)", margin: "8px 0" }}>Maak <b>{priceText} euro</b> over naar <b>{iban}</b> t.n.v. {seller}, onder vermelding van <b>{b.name}</b>. Klik daarna op de knop; zodra het bedrag binnen is, zetten we je profiel online en sturen we de factuur.</p>
                    <form method="post" action={`/dashboard/${slug}/bank/`}><button className="btn btn-outline" type="submit">Ik heb overgemaakt</button></form>
                  </details>
                ))}
                {!mollieEnabled() && !iban && <span className="srnote">Betalen is binnenkort mogelijk; je profiel blijft bewaard.</span>}
              </>
            )}
            <a href={`/bedrijf/${slug}/`} className="btn btn-outline" style={{ justifyContent: "center" }}>{live ? "Bekijk je profiel" : "Bekijk voorbeeld"}</a>
          </div>
          
        </aside>
      </div>
    </main>
  );
}
