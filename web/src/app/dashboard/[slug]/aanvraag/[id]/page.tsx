import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getBusiness, one, q } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { currentVertical, waHref } from "@/lib/site";
export const metadata: Metadata = { title: "Offerteaanvraag", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const WHEN: Record<string, string> = { spoed: "Spoed, er lekt iets", "2weken": "Binnen 2 weken", "3maanden": "Binnen 3 maanden", orienterend: "Oriënterend, geen haast" };
const ROOF: Record<string, string> = { hellend: "Hellend dak (pannen of leien)", plat: "Plat dak", beide: "Hellend en plat", onbekend: "Weet de aanvrager niet" };
const PREF: Record<string, string> = { bellen: "Bellen", whatsapp: "WhatsApp", mail: "E-mail" };
const STATUS: [string, string][] = [["new", "Nieuw"], ["contacted", "Contact gehad"], ["quoted", "Offerte gestuurd"], ["won", "Opdracht gekregen"], ["lost", "Niet doorgegaan"]];

export default async function Aanvraag({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const v = await currentVertical(); const user = await getUser(); if (!user) redirect("/dashboard/");
  const b = await getBusiness(slug, v.id); if (!b) notFound();
  if (b.owner_user_id !== user.id && !user.is_admin) redirect("/dashboard/");
  const a = await one<{ id: string; status: string; viewed_at: string | null; name: string; phone: string; email: string | null; service_slug: string | null; description: string | null; wanted_when: string | null; address: string | null; size_m2: number | null; roof_type: string | null; contact_pref: string | null; photo_urls: string[]; created_at: string }>(`
    select l.id, l.status, l.viewed_at::text, r.name, r.phone, r.email, r.service_slug, r.description, r.wanted_when, r.address, r.size_m2, r.roof_type, r.contact_pref, r.photo_urls, r.created_at::text
    from leads l join lead_requests r on r.id=l.request_id where l.id=$1 and l.business_id=$2`, [id, b.id]);
  if (!a) notFound();
  const paid = b.status === "claimed" || b.status === "pro" || user.is_admin;
  if (!a.viewed_at && paid) await q("update leads set viewed_at=now() where id=$1", [a.id]);
  const mask = (s: string) => s.slice(0, 2) + "•".repeat(Math.max(3, s.length - 2));
  if (!paid) { a.name = mask(a.name); a.phone = "06 ••••••••"; a.email = a.email ? mask(a.email.split("@")[0]) + "@…" : null; a.description = (a.description ?? "").slice(0, 60) + " …"; a.photo_urls = []; }
  const phone = a.phone.replace(/\s/g, ""); const wa = waHref(a.phone, b.name) ? `https://wa.me/${phone.replace(/^0/, "31")}?text=${encodeURIComponent(`Hallo ${a.name.split(" ")[0]}, bedankt voor je offerteaanvraag bij ${b.name} via Lokale Dakdekkers. `)}` : null;
  const date = new Date(a.created_at).toLocaleString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const serviceName = v.services.find((s) => s.slug === a.service_slug)?.name ?? (a.service_slug === "anders" ? "Iets anders of onbekend" : a.service_slug ?? "Niet opgegeven");
  const rows: [string, string][] = [["Wat moet er gebeuren", serviceName], ["Soort dak", ROOF[a.roof_type ?? ""] ?? "Niet opgegeven"], ["Oppervlakte", a.size_m2 ? `ongeveer ${a.size_m2} m2` : "Niet opgegeven"], ["Wanneer", WHEN[a.wanted_when ?? ""] ?? "Niet opgegeven"], ["Adres van het dak", a.address ?? "Niet opgegeven"], ["Naam", a.name], ["Telefoon", a.phone], ["E-mail", a.email ?? "Niet opgegeven"], ["Wil benaderd worden via", PREF[a.contact_pref ?? ""] ?? "Geen voorkeur"], ["Ontvangen", date]];
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 820 }}>
      <nav className="crumbs"><a href={`/dashboard/${slug}/`}>Dashboard</a><span>/</span><a href={`/dashboard/${slug}/#aanvragen`}>Offerteaanvragen</a><span>/</span><b>{a.name}</b></nav>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h1 style={{ fontSize: 28 }}>Aanvraag van {a.name}</h1>
        {a.wanted_when === "spoed" && <span className="badge badge-spoed" style={{ fontSize: 14 }}>Spoed</span>}
      </div>
      {!paid && <div className="card" style={{ marginTop: 14, borderColor: "var(--amber)", background: "var(--amber-bg)" }}><b>Naam, telefoonnummer en de volledige omschrijving zie je zodra je profiel online staat.</b> <a href={`/dashboard/${slug}/`}>Betaal 79,95 per jaar</a> en alle aanvragen komen rechtstreeks bij jou, hoeveel het er ook zijn.</div>}
      <div className="actions" style={{ marginTop: 14 }}>
        {paid && <a href={`tel:${phone}`} className="btn btn-primary">Bel {a.name.split(" ")[0]}</a>}
        {paid && wa && <a href={wa} className="btn btn-green" rel="noopener">WhatsApp</a>}
        {paid && a.email && <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Je offerteaanvraag bij ${b.name}`)}`} className="btn btn-outline">Mail</a>}
      </div>
      <section className="card" style={{ marginTop: 20, display: "grid", gap: 10 }}>
        {rows.map(([k, val]) => <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr", gap: 12, fontSize: 15 }}><span style={{ color: "var(--ink-3)" }}>{k}</span><b>{val}</b></div>)}
      </section>
      <section className="card" style={{ marginTop: 12 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Omschrijving</h2>
        <p style={{ whiteSpace: "pre-wrap", color: "var(--ink)", fontSize: 16, lineHeight: 1.55 }}>{a.description}</p>
      </section>
      {a.photo_urls?.length > 0 && (
        <section className="card" style={{ marginTop: 12 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Foto's van de situatie ({a.photo_urls.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            {a.photo_urls.map((u) => <a key={u} href={u} target="_blank" rel="noopener"><img src={u} alt="" style={{ width: "100%", borderRadius: 12, display: "block" }} /></a>)}
          </div>
        </section>
      )}
      <section className="card" style={{ marginTop: 12 }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>Status</h2>
        <form method="post" action={`/dashboard/${slug}/aanvraag/${a.id}/status/`} className="chips">
          {STATUS.map(([val, label]) => <button key={val} name="status" value={val} className={`pill${a.status === val ? " on" : ""}`} type="submit">{label}</button>)}
        </form>
        <span className="srnote" style={{ display: "block", marginTop: 10 }}>Alleen jij ziet dit; het helpt je overzicht te houden.</span>
      </section>
    </main>
  );
}
