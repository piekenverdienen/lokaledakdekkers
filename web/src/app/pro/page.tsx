import { currentVertical, cap } from "@/lib/site";
export default async function Pro() {
  const v = await currentVertical();
  const price = (v.pro_price_month_cents / 100).toLocaleString("nl-NL");
  return (<main className="wrap" style={{ padding: "32px 24px 64px", maxWidth: 720 }}><h1>Pro voor {v.name_plural}</h1><p className="lede" style={{ marginTop: 12 }}>Bovenaan in je werkgebied, badge Aanbevolen, offerteaanvragen van maximaal 3 bedrijven per aanvraag, WhatsApp-knop, tot 30 projectfoto's en reviews met factuurbewijs. {price} euro per maand exclusief btw, eerste 14 dagen gratis, opzegbaar per maand. Beschikbaar vanaf ronde 5.</p></main>);
}
