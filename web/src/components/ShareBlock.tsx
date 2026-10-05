"use client";
import { useState } from "react";
export default function ShareBlock({ url, text, image }: { url: string; text: string; image: string }) {
  const [copied, setCopied] = useState<"" | "tekst" | "link">("");
  const enc = encodeURIComponent; const full = `${text} ${url}`;
  const copy = async (what: "tekst" | "link") => { try { await navigator.clipboard.writeText(what === "tekst" ? full : url); setCopied(what); setTimeout(() => setCopied(""), 2000); } catch { /* niets */ } };
  const btn = (href: string, label: string) => <a key={label} href={href} target="_blank" rel="noopener" className="btn btn-outline" style={{ padding: "8px 14px", minHeight: 40, fontSize: 14 }}>{label}</a>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <img src={image} alt="Deelafbeelding van je profiel" style={{ width: "100%", maxWidth: 480, borderRadius: 12, display: "block", border: "1px solid var(--line)" }} />
      <textarea readOnly value={full} rows={3} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, fontSize: 15, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "var(--chip)" }} />
      <div className="actions">
        {btn(`https://wa.me/?text=${enc(full)}`, "WhatsApp")}
        {btn(`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, "LinkedIn")}
        {btn(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`, "Facebook")}
        {btn(`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`, "X")}
        <button type="button" onClick={() => copy("tekst")} className="btn btn-outline" style={{ padding: "8px 14px", minHeight: 40, fontSize: 14 }}>{copied === "tekst" ? "Gekopieerd" : "Tekst kopiëren"}</button>
        <a href={image} download className="btn btn-outline" style={{ padding: "8px 14px", minHeight: 40, fontSize: 14 }}>Afbeelding downloaden</a>
      </div>
      <span className="srnote">Op LinkedIn en Facebook verschijnt de afbeelding vanzelf bij de link. Voor Instagram: afbeelding downloaden en als bericht plaatsen met de tekst erbij.</span>
    </div>
  );
}
