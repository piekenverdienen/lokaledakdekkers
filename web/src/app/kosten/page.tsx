import type { Metadata } from "next";
import { currentVertical, cap } from "@/lib/site";
export const metadata: Metadata = { title: "Wat kost dakwerk? Richtprijzen per regio uit echte facturen", alternates: { canonical: "/kosten/" } };
export default async function Kosten() {
  const v = await currentVertical();
  return (
    <main className="wrap" style={{ padding: "32px 24px 64px", maxWidth: 800 }}>
      <h1>Wat kost dakwerk?</h1>
      <p className="lede" style={{ marginTop: 12 }}>Richtprijzen op {v.brand} komen uit facturen van geverifieerde klussen, per provincie en per soort dakwerk. Een richtprijs verschijnt pas bij minimaal vijf facturen, met de steekproefgrootte en de datum erbij. Geen cijfers uit andere websites, geen schattingen.</p>
      <div className="card" style={{ marginTop: 24 }}>Er zijn nog geen vijf geverifieerde facturen per provincie. Zodra die er zijn, staan hier de richtprijzen per m2 voor pannendaken, platte daken, dakkapellen en dakisolatie.</div>
      <p style={{ marginTop: 24 }}><a href="/">Terug naar alle {v.name_plural}</a></p>
    </main>
  );
}
