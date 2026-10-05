import type { Metadata } from "next";
import ArticleView from "@/components/ArticleView";
import { getArticle } from "@/lib/kennis";
import { baseUrl, currentVertical } from "@/lib/site";
export const revalidate = 86400;
export async function generateMetadata(): Promise<Metadata> {
  const v = await currentVertical(); const a = getArticle("betrouwbare-dakdekker-kiezen")!;
  return { title: a.title, description: a.description, alternates: { canonical: `/betrouwbare-${v.name_singular}/` } };
}
export default async function Betrouwbaar() {
  const v = await currentVertical(); const a = getArticle("betrouwbare-dakdekker-kiezen")!;
  const related = a.related.map((s) => getArticle(s)).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];
  return <ArticleView a={a} v={v} base={baseUrl(v)} canonical={`/betrouwbare-${v.name_singular}/`} related={related} />;
}
