import type { Vertical } from "./db";

export type Extracted = {
  description: string | null;
  services: string[];
  area: string[];
  emergency: boolean;
  certifications: string[];
  usps: string[];
  founded_year: number | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  photos: string[];
  pages_read: number;
};

const UA = "Mozilla/5.0 (compatible; LokaalBot/0.1; +https://lokaledakdekkers.nl/over-lokaalbot)";

async function get(url: string, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: ctrl.signal, redirect: "follow" });
    if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
    return await r.text();
  } catch { return null; } finally { clearTimeout(t); }
}

function strip(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|li|h\d|tr|br|section|article)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function abs(base: URL, href: string) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

function links(html: string, base: URL) {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#?]+)["']/gi)) {
    const u = abs(base, m[1]);
    if (!u) continue;
    const x = new URL(u);
    if (x.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|webp|zip|mp4)$/i.test(x.pathname)) continue;
    out.add(x.origin + x.pathname);
  }
  // voorrang voor pagina's die bij een vakbedrijf tellen
  const score = (u: string) => /dienst|service|werk|project|portfolio|referentie|over|contact|dak|werkgebied|regio|keurmerk|garantie/i.test(u) ? 0 : 1;
  return [...out].sort((a, b) => score(a) - score(b)).slice(0, 10);
}

function images(html: string, base: URL) {
  const out: string[] = [];
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  for (const m of html.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0];
    if (/logo|icon|sprite|pixel|tracking|\.svg/i.test(m[1]) || /width=["']?\d{1,2}["']?/.test(tag)) continue;
    const u = abs(base, m[1]);
    if (u && !out.includes(u)) out.push(u);
  }
  const logo = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)?.map((t) => t.match(/src=["']([^"']+)["']/i)?.[1] ?? "").find((s) => /logo/i.test(s));
  return { og: og ? abs(base, og) : null, logo: logo ? abs(base, logo) : null, photos: out.slice(0, 12) };
}

export async function readSite(website: string) {
  const base = new URL(website.startsWith("http") ? website : `https://${website}`);
  const home = await get(base.toString());
  if (!home) return null;
  const pages: { url: string; text: string }[] = [{ url: base.toString(), text: strip(home).slice(0, 6000) }];
  for (const u of links(home, base)) {
    if (pages.length >= 10) break;
    const h = await get(u, 10000);
    if (h) pages.push({ url: u, text: strip(h).slice(0, 4000) });
  }
  const meta = home.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? null;
  const title = home.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
  const img = images(home, base);
  const tel = home.match(/href=["']tel:([^"']+)["']/i)?.[1] ?? null;
  const mail = home.match(/href=["']mailto:([^"'?]+)["']/i)?.[1] ?? null;
  return { base, pages, meta, title, img, tel, mail };
}

export async function extractProfile(v: Vertical, website: string, businessName: string): Promise<Extracted | null> {
  const site = await readSite(website);
  if (!site) return null;
  const services = v.services.map((s) => s.slug);
  const fallback: Extracted = {
    description: site.meta, services: [], area: [], emergency: false, certifications: [], usps: [], founded_year: null,
    phone: site.tel, email: site.mail, logo_url: site.img.logo ?? site.img.og, photos: site.img.photos, pages_read: site.pages.length,
  };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fallback;

  const prompt = `Je krijgt de tekst van de website van ${businessName}, een ${v.name_singular} in Nederland. Geef uitsluitend een JSON-object terug, zonder uitleg en zonder markdown, met deze velden:
- description: 80 tot 150 woorden, derde persoon, feitelijk, zonder superlatieven en zonder em-dashes. Alleen wat op de site staat.
- services: lijst met slugs uit precies deze set: ${services.join(", ")}. Alleen diensten die de site noemt.
- area: lijst met Nederlandse plaatsnamen die de site als werkgebied noemt (maximaal 25).
- emergency: true als de site spoed, 24/7 of storingsdienst noemt.
- certifications: keurmerken en lidmaatschappen die letterlijk genoemd worden (bijv. VEBIDAK, Dakmeester, VCA, garantiefonds).
- usps: maximaal 4 korte unieke punten, letterlijk uit de site.
- founded_year: oprichtingsjaar als genoemd, anders null.
- phone: telefoonnummer als genoemd, anders null.
- email: e-mailadres als genoemd, anders null.
Website-tekst:
${site.pages.map((p) => `### ${p.url}\n${p.text}`).join("\n\n").slice(0, 40000)}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.EXTRACT_MODEL ?? "claude-haiku-4-5", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }),
    });
    const data = await r.json();
    const text: string = data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return {
      description: typeof json.description === "string" ? json.description.replace(/—|–/g, ",") : fallback.description,
      services: Array.isArray(json.services) ? json.services.filter((s: string) => services.includes(s)) : [],
      area: Array.isArray(json.area) ? json.area.slice(0, 25) : [],
      emergency: !!json.emergency,
      certifications: Array.isArray(json.certifications) ? json.certifications.slice(0, 8) : [],
      usps: Array.isArray(json.usps) ? json.usps.slice(0, 4) : [],
      founded_year: Number.isInteger(json.founded_year) ? json.founded_year : null,
      phone: json.phone ?? fallback.phone, email: json.email ?? fallback.email,
      logo_url: fallback.logo_url, photos: fallback.photos, pages_read: site.pages.length,
    };
  } catch (e) {
    console.error("extract", e);
    return fallback;
  }
}
