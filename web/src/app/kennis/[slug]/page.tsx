import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleView from "@/components/ArticleView";
import { getAllArticles, getArticle } from "@/lib/kennis";
import { baseUrl, currentVertical } from "@/lib/site";
export const revalidate = 86400;
type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return getAllArticles().map((a) => ({ slug: a.slug })); }
const canonicalFor = (slug: string, single: string) => slug === "betrouwbare-dakdekker-kiezen" ? `/betrouwbare-${single}/` : `/kennis/${slug}/`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const a = getArticle(slug); const v = await currentVertical();
  if (!a) return {};
  return { title: a.title, description: a.description, alternates: { canonical: canonicalFor(slug, v.name_singular) }, openGraph: { title: a.title, description: a.description, type: "article", publishedTime: a.date, modifiedTime: a.updated } };
}
export default async function ArticlePage({ params }: Props) {
  const { slug } = await params; const a = getArticle(slug); const v = await currentVertical();
  if (!a) notFound();
  const related = a.related.map((s) => getArticle(s)).filter(Boolean) as NonNullable<ReturnType<typeof getArticle>>[];
  return <ArticleView a={a} v={v} base={baseUrl(v)} canonical={canonicalFor(slug, v.name_singular)} related={related} />;
}
