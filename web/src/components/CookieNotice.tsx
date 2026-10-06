"use client";
import { useEffect, useState } from "react";
declare global { interface Window { gtag?: (...args: unknown[]) => void } }
// Toestemming voor statistieken (GA4, Consent Mode v2). Zonder akkoord plaatst Google geen cookies.
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!/ld_consent=/.test(document.cookie)) setShow(true); } catch { /* niets */ } }, []);
  if (!show) return null;
  const choose = (analytics: boolean) => {
    try { document.cookie = `ld_consent=${analytics ? "analytics" : "necessary"}; max-age=31536000; path=/; samesite=lax`; window.gtag?.("consent", "update", { analytics_storage: analytics ? "granted" : "denied" }); } catch { /* niets */ }
    setShow(false);
  };
  return (
    <div role="region" aria-label="Cookies" style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60, maxWidth: 600, margin: "0 auto", background: "#142E3A", color: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.28)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, fontSize: 14, lineHeight: 1.45 }}>
      <span style={{ flex: "1 1 320px" }}>We gebruiken functionele cookies om de site te laten werken. Met je toestemming meten we ook anoniem hoe de site wordt gebruikt (Google Analytics), zodat we hem kunnen verbeteren. Geen advertenties. <a href="/privacy/" style={{ color: "#E2B59E" }}>Privacyverklaring</a></span>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => choose(false)} className="btn btn-ghost" style={{ minHeight: 40, padding: "8px 14px", color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}>Alleen noodzakelijk</button>
        <button onClick={() => choose(true)} className="btn btn-amber" style={{ minHeight: 40, padding: "8px 16px" }}>Accepteren</button>
      </span>
    </div>
  );
}
