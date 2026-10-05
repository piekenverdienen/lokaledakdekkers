// Klikbaar label: wat is er gecontroleerd en wanneer. Zegt bewust niets over de kwaliteit van het dakwerk.
export default function VerifiedBadge({ verifiedAt, kvkCheckedAt, paidUntil, small = false }: { verifiedAt: string | null; kvkCheckedAt: string | null; paidUntil: string | null; small?: boolean }) {
  const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : null);
  return (
    <details className="vbadge">
      <summary className="verified" style={{ cursor: "pointer", fontSize: small ? 13 : 14 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
        Geverifieerd bedrijf <span aria-hidden="true" style={{ opacity: 0.7 }}>ⓘ</span>
      </summary>
      <div className="vbadge-pop">
        <b>Wat we gecontroleerd hebben</b>
        <ul>
          <li>KvK-inschrijving actief{d(kvkCheckedAt) ? `, gecontroleerd ${d(kvkCheckedAt)}` : ""}</li>
          <li>Eigenaar bevestigd via de website en het e-mailadres van het bedrijf{d(verifiedAt) ? `, op ${d(verifiedAt)}` : ""}</li>
          <li>Profiel actief tot {paidUntil ? d(paidUntil) : "onbekend"}</li>
        </ul>
        <small>Dit label zegt dat het bedrijf echt is en zelf achter dit profiel staat. Het zegt niets over de kwaliteit van het dakwerk; kijk daarvoor naar reviews met factuurbewijs en vraag referenties.</small>
      </div>
    </details>
  );
}
