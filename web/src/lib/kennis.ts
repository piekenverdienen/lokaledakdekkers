import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { marked } from "marked";

export type Article = {
  slug: string; title: string; description: string; date: string; updated: string;
  illustration: string; category: string; readMinutes: number; keywords: string[];
  image: string | null; imageAlt: string; imageTitle: string;
  faq: { q: string; a: string }[]; related: string[]; html: string; toc: { id: string; text: string }[];
};

const DIR = join(process.cwd(), "content", "kennis");

function parse(raw: string) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1].split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: m ? m[2] : raw };
}

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function getArticle(slug: string): Article | null {
  let raw: string;
  try { raw = readFileSync(join(DIR, `${slug}.md`), "utf8"); } catch { return null; }
  const { meta, body } = parse(raw);
  // FAQ: het blok onder "## Veelgestelde vragen" met ### vragen
  const faq: { q: string; a: string }[] = [];
  const parts = body.split(/^## Veelgestelde vragen\s*$/m);
  const main = parts[0];
  if (parts[1]) {
    for (const qa of parts[1].split(/^### /m).slice(1)) {
      const [q, ...rest] = qa.split("\n");
      faq.push({ q: q.trim(), a: rest.join("\n").trim().replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") });
    }
  }
  const toc: { id: string; text: string }[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text);
    if (depth === 2) toc.push({ id, text });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  const html = marked.parse(main, { renderer }) as string;
  const words = main.split(/\s+/).length;
  return {
    slug, title: meta.title, description: meta.description, date: meta.date, updated: meta.updated ?? meta.date,
    illustration: meta.illustration ?? slug, category: meta.category ?? "Kennis", readMinutes: Math.max(3, Math.round(words / 200)),
    image: meta.image ?? null, imageAlt: meta.image_alt ?? meta.title ?? "", imageTitle: meta.image_title ?? meta.title ?? "",
    keywords: (meta.keywords ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    related: (meta.related ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    faq, html, toc,
  };
}

export function getAllArticles(): Article[] {
  return readdirSync(DIR).filter((f) => f.endsWith(".md")).map((f) => getArticle(f.replace(/\.md$/, ""))!).filter(Boolean)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}
