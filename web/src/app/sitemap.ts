import type { MetadataRoute } from "next";
import { getAllMunicipalities, getIndexablePlaces, getProvinces, getPublicBusinessSlugs } from "@/lib/db";
import { baseUrl, currentVertical } from "@/lib/site";
import { getAllArticles } from "@/lib/kennis";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const v = await currentVertical();
  const base = baseUrl(v);
  const [provinces, munis, places, businesses] = await Promise.all([getProvinces(v.id), getAllMunicipalities(), getIndexablePlaces(v.id), getPublicBusinessSlugs(v.id)]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/kosten/`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/betrouwbare-${v.name_singular}/`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pro/`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/kennis/`, changeFrequency: "weekly", priority: 0.8 },
    ...getAllArticles().filter((a) => a.slug !== "betrouwbare-dakdekker-kiezen").map((a) => ({ url: `${base}/kennis/${a.slug}/`, lastModified: new Date(a.updated), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...provinces.map((p) => ({ url: `${base}/${p.slug}/`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...munis.map((m) => ({ url: `${base}/${m.province_slug}/${m.slug}/`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...places.map((p) => ({ url: `${base}/${p.province_slug}/${p.municipality_slug}/${p.slug}/`, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...businesses.map((b) => ({ url: `${base}/bedrijf/${b.slug}/`, lastModified: new Date(b.updated_at), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
