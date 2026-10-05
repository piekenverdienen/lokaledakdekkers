import type { Business, Vertical } from "@/lib/db";
import { businessPath, formatPhone, serviceName, telHref, waHref } from "@/lib/site";
import VerifiedBadge from "@/components/VerifiedBadge";

const Check = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const Star = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#C97A0F" aria-hidden="true"><path d="M12 2l3 7 7 .6-5.3 4.7L18.4 22 12 18 5.6 22l1.7-7.7L2 9.6 9 9z" /></svg>
);

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export default function BusinessCard({ b, v, placeContext }: { b: Business; v: Vertical; placeContext?: string }) {
  const pro = b.status === "pro";
  const claimed = b.status === "claimed" || pro;
  const tel = telHref(b.phone);
  const wa = pro ? waHref(b.whatsapp ?? b.phone, v.brand) : null;

  if (b.status === "unclaimed") {
    return (
      <article className="biz unclaimed" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", padding: "18px 22px" }}>
        <div>
          <h2 style={{ fontSize: 18, color: "var(--ink-2)" }}><a href={businessPath(b)} style={{ textDecoration: "none", color: "inherit" }}>{b.name}</a></h2>
          <small style={{ color: "var(--ink-3)" }}>
            {b.city}{b.distance_km != null ? `, ${String(b.distance_km).replace(".", ",")} km` : ""}. Nog niet geclaimd door het bedrijf.
          </small>
        </div>
        <div className="actions" style={{ alignItems: "center" }}>
          {b.phone && <span style={{ fontSize: 15, color: "var(--ink-2)" }}>{formatPhone(b.phone)}</span>}
          <a href={`/claim/${b.slug}/`} className="btn btn-outline" style={{ padding: "10px 14px" }}>Is dit jouw bedrijf?</a>
        </div>
      </article>
    );
  }

  return (
    <article className={`biz${pro ? " pro" : ""}`}>
      <div className="biz-head">
        <div className={`logo${pro ? " pro" : ""}`}>{b.logo_url ? <img src={b.logo_url} alt="" /> : initials(b.name)}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          <div className="biz-title">
            <h2><a href={businessPath(b)} style={{ textDecoration: "none", color: "inherit" }}>{b.name}</a></h2>
            {pro && <span className="badge"><Star /> Aanbevolen</span>}
            {claimed && <VerifiedBadge small verifiedAt={b.verified_at} kvkCheckedAt={b.kvk_checked_at} paidUntil={b.paid_until} />}
          </div>
          <div className="meta">
            {b.avg_score != null && <span><b>{String(b.avg_score).replace(".", ",")}</b></span>}
            <span>{b.review_count} reviews{b.verified_reviews > 0 ? `, ${b.verified_reviews} met factuurbewijs` : ""}</span>
            {b.city && <span>{b.city}{b.distance_km != null ? `, ${String(b.distance_km).replace(".", ",")} km` : ""}</span>}
            {b.emergency && <span className="spoed">Spoed bij lekkage</span>}
          </div>
          {pro && placeContext && <span className="srnote">Bovenaan in {placeContext}</span>}
        </div>
      </div>
      {b.description && <p style={{ color: "var(--ink-2)" }}>{b.description}</p>}
      {b.services.length > 0 && (
        <div className="chips">{b.services.slice(0, 6).map((s) => <span key={s} className="chip">{serviceName(v, s)}</span>)}</div>
      )}
      <div className="actions">
        {tel && <a href={tel} className="btn btn-primary">{formatPhone(b.phone)}</a>}
        {wa && <a href={wa} className="btn btn-green" rel="noopener">WhatsApp</a>}
        {pro && <a href={`/offerte/?bedrijf=${b.slug}`} className="btn btn-outline">Vraag een offerte</a>}
        <a href={businessPath(b)} className="btn btn-ghost">Bekijk profiel</a>
      </div>
    </article>
  );
}
