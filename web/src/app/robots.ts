import type { MetadataRoute } from "next";
import { baseUrl, currentVertical } from "@/lib/site";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const v = await currentVertical();
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/claim/", "/offerte/", "/dashboard/", "/admin/", "/zoeken/", "/review/"] }], sitemap: `${baseUrl(v)}/sitemap.xml` };
}
