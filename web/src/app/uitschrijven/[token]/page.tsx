import type { Metadata } from "next";
import { one, q } from "@/lib/db";
export const metadata: Metadata = { title: "Uitgeschreven", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function Uitschrijven({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const o = await one<{ business_id: string; name: string; slug: string }>("select o.business_id, b.name, b.slug from outreach o join businesses b on b.id=o.business_id where o.token=$1", [token]);
  if (o) await q("update businesses set outreach_opt_out=true where id=$1", [o.business_id]);
  return (
    <main className="wrap" style={{ paddingTop: 32, paddingBottom: 64, maxWidth: 640 }}>
      <h1 style={{ fontSize: 28 }}>{o ? "Je krijgt geen mails meer over dit profiel" : "Deze link is niet (meer) geldig"}</h1>
      {o && <p className="lede" style={{ marginTop: 10 }}>We sturen geen berichten meer over {o.name}. De basisvermelding uit het Handelsregister blijft staan; wil je die laten aanpassen of weghalen, dan kan dat gratis via <a href={`/corrigeren/${o.slug}/`}>gegevens corrigeren</a>.</p>}
    </main>
  );
}
