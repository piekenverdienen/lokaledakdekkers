import type { Metadata } from "next";
import { currentVertical } from "@/lib/site";
export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact/" } };
export default async function Contact() {
  const v = await currentVertical();
  return (
    <main className="wrap prose" style={{ paddingTop: 24, paddingBottom: 64, maxWidth: 680 }}>
      <h1>Contact</h1>
      <p>{v.brand} is een dienst van YourFellow B.V. Mail ons op <a href={`mailto:info@${v.domain}`}>info@{v.domain}</a>; we reageren binnen twee werkdagen.</p>
      <h2>Ben je {v.name_singular}?</h2>
      <p>Kloppen je gegevens niet, gebruik dan <a href="/corrigeren/">Gegevens corrigeren</a>. Wil je je profiel beheren, dan kun je het <a href="/claim/">claimen</a>. Alles over het aanbod staat op <a href="/voor-dakdekkers/">Voor {v.name_plural}</a>.</p>
      <h2>Zoek je een {v.name_singular}?</h2>
      <p>We bemiddelen niet zelf. Zoek je plaats op de <a href="/">kaart</a> en neem rechtstreeks contact op met een bedrijf, of lees eerst <a href={`/betrouwbare-${v.name_singular}/`}>hoe je een betrouwbare {v.name_singular} kiest</a>.</p>
    </main>
  );
}
