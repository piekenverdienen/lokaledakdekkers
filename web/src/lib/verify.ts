import { readSite } from "./extract";
import { domainsMatch, websiteDomain } from "./auth";

// Automatische verificatie: de site moet van dit bedrijf zijn (naam of KvK-nummer op de site)
// en het e-mailadres moet bij de site horen (zelfde domein, of letterlijk op de site genoemd).
export async function verifyClaim(website: string, email: string, name: string, kvk: string | null) {
  const site = await readSite(website).catch(() => null);
  if (!site) return { ok: false as const, reason: "site" as const };
  const text = site.pages.map((p) => p.text).join("\n").toLowerCase();
  const norm = (s: string) => s.toLowerCase().replace(/\b(b\.?v\.?|v\.?o\.?f\.?|dakdekkersbedrijf|dakdekker|dakwerken|dakbedekking|dakbedekkingen)\b/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const nameWords = norm(name).split(" ").filter((w) => w.length > 2);
  const nameHit = nameWords.length > 0 && nameWords.filter((w) => text.includes(w)).length >= Math.min(2, nameWords.length);
  const kvkHit = !!kvk && text.replace(/\s/g, "").includes(kvk.replace(/^0+/, ""));
  if (!nameHit && !kvkHit) return { ok: false as const, reason: "naam" as const };
  const e = email.trim().toLowerCase();
  const emailHit = domainsMatch(e, website) || text.includes(e) || (site.mail ?? "").toLowerCase() === e;
  if (!emailHit) return { ok: false as const, reason: "email" as const, domain: websiteDomain(website) };
  return { ok: true as const, pages: site.pages.length };
}
