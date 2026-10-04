import { currentVertical } from "@/lib/site";
export const metadata = { robots: { index: false } };
export default async function Claim() {
  const v = await currentVertical();
  return (<main className="wrap" style={{ padding: "32px 24px 64px", maxWidth: 720 }}><h1>Claim je profiel</h1><p className="lede" style={{ marginTop: 12 }}>De claim-flow komt in ronde 4. Tot die tijd: mail naar info@{v.domain} met je bedrijfsnaam en KvK-nummer, dan zetten wij je profiel op Geverifieerd.</p></main>);
}
