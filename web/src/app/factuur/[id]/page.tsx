import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { one } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Factuur", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Factuur({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const v = await currentVertical(); const user = await getUser(); if (!user) redirect("/dashboard/");
  const p = await one<{ id: string; invoice_no: number | null; amount_cents: number; paid_at: string | null; consumer_name: string | null; provider_id: string; name: string; city: string | null; kvk_number: string | null; owner_user_id: string | null; street: string | null; housenumber: string | null; postcode: string | null; email: string | null }>(`
    select p.id, p.invoice_no, p.amount_cents, p.paid_at::text, p.consumer_name, p.provider_id, b.name, b.city, b.kvk_number, b.owner_user_id, b.street, b.housenumber, b.postcode, b.email
    from payments p join businesses b on b.id=p.business_id where p.id=$1 and p.status='paid'`, [id]);
  if (!p) notFound(); if (p.owner_user_id !== user.id && !user.is_admin) redirect("/dashboard/");
  const incl = p.amount_cents / 100, excl = incl / 1.21, btw = incl - excl; const f = (n: number) => n.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const date = p.paid_at ? new Date(p.paid_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" }) : "";
  const S = { seller: process.env.INVOICE_SELLER ?? "YourFellow B.V.", address: process.env.INVOICE_ADDRESS ?? "", kvk: process.env.INVOICE_KVK ?? "", btw: process.env.INVOICE_BTW ?? "", iban: process.env.INVOICE_IBAN ?? "" };
  return (
    <main className="wrap" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 720 }}>
      <style>{`@media print { .nav, .footer, .noprint { display: none !important } body { background: #fff } }`}</style>
      <div className="noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}><a href="/dashboard/">Terug naar het dashboard</a><a href="#" className="btn btn-outline" onClick={undefined}>Afdrukken of opslaan als pdf via Ctrl+P</a></div>
      <section className="card" style={{ padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div><b style={{ fontSize: 20 }}>{v.brand}</b><br /><span style={{ color: "var(--ink-2)", fontSize: 14 }}>{S.seller}{S.address ? <><br />{S.address}</> : null}{S.kvk ? <><br />KvK {S.kvk}</> : null}{S.btw ? <><br />Btw {S.btw}</> : null}</span></div>
          <div style={{ textAlign: "right" }}><b style={{ fontSize: 22 }}>Factuur</b><br /><span style={{ color: "var(--ink-2)", fontSize: 14 }}>Nummer {p.invoice_no ?? "-"}<br />Datum {date}<br />Betaald via iDEAL, Mollie {p.provider_id}</span></div>
        </div>
        <div style={{ marginTop: 28, fontSize: 15 }}><span style={{ color: "var(--ink-3)" }}>Aan</span><br /><b>{p.name}</b><br />{p.street ? `${p.street} ${p.housenumber ?? ""}` : ""}{p.street && p.postcode ? <br /> : null}{p.postcode ? `${p.postcode} ${p.city ?? ""}` : p.city ?? ""}{p.kvk_number ? <><br />KvK {p.kvk_number}</> : null}</div>
        <table style={{ width: "100%", marginTop: 28, borderCollapse: "collapse", fontSize: 15 }}>
          <thead><tr style={{ borderBottom: "2px solid var(--line)", textAlign: "left" }}><th style={{ padding: "8px 0" }}>Omschrijving</th><th style={{ textAlign: "right" }}>Bedrag</th></tr></thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid var(--line)" }}><td style={{ padding: "10px 0" }}>Geverifieerd profiel op {v.domain}, 12 maanden vanaf {date}</td><td style={{ textAlign: "right" }}>{f(excl)}</td></tr>
            <tr><td style={{ padding: "8px 0", color: "var(--ink-2)" }}>Btw 21%</td><td style={{ textAlign: "right", color: "var(--ink-2)" }}>{f(btw)}</td></tr>
            <tr style={{ borderTop: "2px solid var(--line)" }}><td style={{ padding: "10px 0" }}><b>Totaal, voldaan</b></td><td style={{ textAlign: "right" }}><b>{f(incl)} euro</b></td></tr>
          </tbody>
        </table>
        <p style={{ color: "var(--ink-3)", fontSize: 13, marginTop: 24 }}>Deze factuur is al betaald; er hoeft niets te worden overgemaakt. Vragen: info@{v.domain}.</p>
      </section>
    </main>
  );
}
