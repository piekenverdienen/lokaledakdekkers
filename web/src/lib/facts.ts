// Vaste feiten per bedrijf die AI-assistenten gebruiken om te kiezen: spoed, materialen, onderdelen, garantie, inspectie, sinds, keurmerken, kernen.
export type Facts = {
  spoed: boolean | null; spoed247: boolean | null; materialen: string[]; onderdelen: string[];
  garantie_jaren: number | null; garantie_op: string | null; gratis_inspectie: boolean | null;
  sinds: number | null; keurmerken: string[]; kernen: string[]; in_het_kort?: string[];
};
const MAT: [string, RegExp][] = [["bitumen", /bitume|dakleer|brandrol|roofing|bitumineus/i], ["EPDM", /\bepdm\b|rubber dak|rubberen dak/i], ["PVC", /\bpvc\b/i], ["TPO", /\btpo\b/i], ["shingles", /shingle/i], ["dakpannen", /dakpan|pannendak|betonpan|keramische pan/i], ["leien", /\blei(en)?\b|leisteen|natuurlei/i], ["zink", /\bzink|zinkwerk|zinken/i], ["lood", /\blood(werk|slab|slabben)?\b/i], ["riet", /\briet(en)?\s?(dak|dekker)|rietdek/i], ["sedum", /sedum|groen dak|groendak/i]];
const OND: [string, RegExp][] = [["plat dak", /plat(te)? dak/i], ["aanbouw", /aanbouw|uitbouw/i], ["garage", /garage/i], ["dakkapel", /dakkapel/i], ["schuur", /schuur|tuinhuis|berging/i], ["bedrijfsdak", /bedrijfs(pand|dak|hal)|industri|utiliteit/i], ["VvE", /\bvve\b|vereniging van eigenaren/i], ["dakgoot", /dakgoot|goten/i], ["schoorsteen", /schoorsteen/i], ["dakraam", /dakraam|velux|lichtkoepel|lichtstraat/i], ["isolatie", /isolat|isoleren/i]];
const KEUR: [string, RegExp][] = [["VCA", /\bvca\b/i], ["Dakmerk", /dakmerk/i], ["VEBIDAK", /vebidak/i], ["BDA", /\bbda\b/i], ["Bouwgarant", /bouwgarant/i], ["KOMO", /\bkomo\b/i], ["Erkend Leerbedrijf", /erkend leerbedrijf|\bsbb\b/i], ["Vakfederatie Rietdekkers", /vakfederatie rietdekkers/i], ["Techniek Nederland", /techniek nederland/i]];
export function keywordFacts(text: string): Facts {
  const t = text.replace(/\s+/g, " ");
  const g = t.match(/(\d{1,2})\s*(jaar|jarige)\s*(schriftelijke\s*)?garantie/i) ?? t.match(/garantie\s*(van\s*)?(\d{1,2})\s*jaar/i);
  const gj = g ? parseInt(g[1] && /^\d+$/.test(g[1]) ? g[1] : g[2], 10) : null;
  const s = t.match(/(sinds|opgericht in|al sinds|vanaf)\s*(19[5-9]\d|20[0-2]\d)/i);
  return {
    spoed: /spoed|lekkage.{0,30}(direct|zelfde dag|binnen 24)|noodreparatie|stormschade/i.test(t) || null,
    spoed247: /24\s*\/\s*7|24 uur per dag|dag en nacht|7 dagen per week/i.test(t) || null,
    materialen: MAT.filter(([, r]) => r.test(t)).map(([n]) => n),
    onderdelen: OND.filter(([, r]) => r.test(t)).map(([n]) => n),
    garantie_jaren: gj && gj > 0 && gj <= 30 ? gj : null, garantie_op: null,
    gratis_inspectie: /gratis (dak)?inspectie|kosteloze (dak)?inspectie|gratis (en vrijblijvend )?advies|vrijblijvende (dak)?inspectie/i.test(t) || null,
    sinds: s ? parseInt(s[2], 10) : null,
    keurmerken: KEUR.filter(([, r]) => r.test(t)).map(([n]) => n), kernen: [],
  };
}
export async function haikuFacts(name: string, text: string): Promise<{ facts: Facts | null; inTok: number; outTok: number }> {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return { facts: null, inTok: 0, outTok: 0 };
  const prompt = `Lees de website-tekst van het dakdekkersbedrijf "${name}" en geef ALLEEN JSON terug, zonder uitleg. Vul alleen in wat letterlijk op de site staat; anders null of een lege lijst.
{"spoed": boolean|null (doen ze spoedreparaties/lekkages op korte termijn), "spoed247": boolean|null (expliciet 24/7 of dag en nacht bereikbaar),
"materialen": [uit: bitumen, EPDM, PVC, TPO, shingles, dakpannen, leien, zink, lood, riet, sedum],
"onderdelen": [uit: plat dak, aanbouw, garage, dakkapel, schuur, bedrijfsdak, VvE, dakgoot, schoorsteen, dakraam, isolatie],
"garantie_jaren": number|null, "garantie_op": string|null (kort, bijvoorbeeld "waterdichtheid"), "gratis_inspectie": boolean|null (gratis inspectie of gratis advies aan huis),
"sinds": number|null (oprichtingsjaar), "keurmerken": [keurmerken en lidmaatschappen zoals VCA, Dakmerk, VEBIDAK, BDA],
"kernen": [plaatsen en kernen waar ze werken, maximaal 15],
"in_het_kort": [4 tot 6 korte feitelijke zinnen in het Nederlands, in de derde persoon, zonder superlatieven en zonder gedachtestreepjes, alleen feiten van de site]}

Website-tekst:
${text.slice(0, 30000)}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.EXTRACT_MODEL ?? "claude-haiku-4-5", max_tokens: 900, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(45000) });
    const d = await r.json(); const txt: string = d?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    const j = JSON.parse(txt.replace(/```json|```/g, "").trim());
    const arr = (x: unknown) => (Array.isArray(x) ? x.filter((y) => typeof y === "string").map((y: string) => y.replace(/—|–/g, ",")) : []);
    return { facts: { spoed: j.spoed ?? null, spoed247: j.spoed247 ?? null, materialen: arr(j.materialen), onderdelen: arr(j.onderdelen), garantie_jaren: typeof j.garantie_jaren === "number" ? j.garantie_jaren : null, garantie_op: j.garantie_op ?? null, gratis_inspectie: j.gratis_inspectie ?? null, sinds: typeof j.sinds === "number" ? j.sinds : null, keurmerken: arr(j.keurmerken), kernen: arr(j.kernen).slice(0, 15), in_het_kort: arr(j.in_het_kort).slice(0, 6) },
      inTok: d?.usage?.input_tokens ?? 0, outTok: d?.usage?.output_tokens ?? 0 };
  } catch { return { facts: null, inTok: 0, outTok: 0 }; }
}
