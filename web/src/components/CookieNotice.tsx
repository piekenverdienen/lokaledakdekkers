"use client";
import { useEffect, useState } from "react";
// Kleine melding: alleen functionele cookies, dus geen toestemming nodig, wel uitleg. Eén klik en hij blijft weg.
export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => { try { if (!document.cookie.includes("ld_cookie=1")) setShow(true); } catch { /* niets */ } }, []);
  if (!show) return null;
  const ok = () => { try { document.cookie = "ld_cookie=1; max-age=31536000; path=/; samesite=lax"; } catch { /* niets */ } setShow(false); };
  return (
    <div role="region" aria-label="Cookies" style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 60, maxWidth: 560, margin: "0 auto", background: "#0E2A3F", color: "#fff", borderRadius: 14, padding: "14px 16px", boxShadow: "0 8px 28px rgba(0,0,0,0.28)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, fontSize: 14, lineHeight: 1.45 }}>
      <span style={{ flex: "1 1 300px" }}>We gebruiken alleen functionele cookies, bijvoorbeeld om je ingelogd te houden. Geen tracking, geen advertenties. <a href="/privacy/" style={{ color: "#F2B33D" }}>Privacyverklaring</a></span>
      <button onClick={ok} className="btn btn-amber" style={{ minHeight: 40, padding: "8px 16px" }}>Oké</button>
    </div>
  );
}
