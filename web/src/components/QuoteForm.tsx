import type { Vertical } from "@/lib/db";
const input: React.CSSProperties = { border: "1px solid var(--line)", borderRadius: 10, padding: "8px 12px", minHeight: 44, fontSize: 16, fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "#fff" };
const lab: React.CSSProperties = { fontWeight: 600, fontSize: 15, display: "flex", flexDirection: "column", gap: 6 };

export default function QuoteForm({ v, slug, name, status }: { v: Vertical; slug: string; name: string; status?: string }) {
  if (status === "sent") return <div className="card" style={{ borderColor: "var(--green)", background: "var(--green-bg)" }}><b>Je aanvraag is verstuurd naar {name}.</b> Je krijgt een kopie per mail. Reageert het bedrijf niet binnen twee werkdagen, bel dan even; dakdekkers zitten vaak op het dak.</div>;
  return (
    <form id="offerte" method="post" action={`/offerte/${slug}/`} encType="multipart/form-data" className="card" style={{ display: "flex", flexDirection: "column", gap: 16, scrollMarginTop: 80, position: "relative" }}>
      <input type="text" name="website2" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden="true" />
      <div>
        <h2 style={{ fontSize: 22 }}>Vraag een offerte aan bij {name}</h2>
        <p style={{ color: "var(--ink-2)", marginTop: 6 }}>Hoe vollediger je aanvraag, hoe sneller en scherper de offerte. Twee minuten invullen, direct naar het bedrijf, nergens anders heen.</p>
      </div>
      <div className="grid cols-2" style={{ gap: 14 }}>
        <label style={lab}>Wat moet er gebeuren?
          <select name="service" required style={input}><option value="">Kies</option>{v.services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}<option value="anders">Iets anders of weet ik niet</option></select>
        </label>
        <label style={lab}>Soort dak
          <select name="roof_type" style={input}><option value="hellend">Hellend dak (pannen of leien)</option><option value="plat">Plat dak</option><option value="beide">Allebei</option><option value="onbekend">Weet ik niet</option></select>
        </label>
        <label style={lab}>Oppervlakte, ongeveer
          <input name="size_m2" type="number" min={1} max={5000} placeholder="Bijvoorbeeld 60" style={input} />
          <span className="srnote" style={{ fontWeight: 400 }}>Een gemiddeld rijtjeshuis heeft 50 tot 70 m2 dak; een dakkapel 4 tot 8 m2. Een schatting is genoeg.</span>
        </label>
        <label style={lab}>Wanneer?
          <select name="wanted_when" required style={input}><option value="spoed">Spoed, er lekt iets</option><option value="2weken">Binnen 2 weken</option><option value="3maanden">Binnen 3 maanden</option><option value="orienterend">Oriënterend, geen haast</option></select>
        </label>
      </div>
      <label style={lab}>Omschrijving
        <textarea name="description" required minLength={30} rows={5} style={{ ...input, minHeight: 120 }} placeholder="Bijvoorbeeld: Lekkage bij de schoorsteen sinds de laatste storm, dak uit 1978 met betonpannen, bereikbaar via de voorkant, hoogte twee verdiepingen." />
        <details className="sorteer" style={{ fontWeight: 400 }}><summary>Wat moet er in staan? (helpt de dakdekker, en jou)</summary>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            <li>Wat is er aan de hand of wat wil je: lekkage, vervanging, isolatie, nieuwe dakkapel</li>
            <li>Hoe oud is het dak ongeveer, en welk materiaal (pannen, bitumen, EPDM, leien)</li>
            <li>Bereikbaarheid: hoeveel verdiepingen, kan er een ladder of steiger staan, is de achterkant bereikbaar</li>
            <li>Of er al eerder aan gewerkt is, en of je een eerdere offerte hebt</li>
            <li>Of er een VvE of vergunning bij komt kijken (bij een dakkapel vaak wel)</li>
          </ul>
        </details>
      </label>
      <label style={lab}>Foto's van de situatie (optioneel, maximaal 4)
        <input name="photos" type="file" accept="image/*" multiple style={{ ...input, padding: 8 }} />
        <span className="srnote" style={{ fontWeight: 400 }}>Een foto van buiten en één van de plek binnen zegt meer dan tien zinnen. Ga niet zelf het dak op.</span>
      </label>
      <div className="grid cols-2" style={{ gap: 14 }}>
        <label style={lab}>Adres van het dak<input name="address" required placeholder="Straat 12, 1234 AB Plaats" style={input} /></label>
        <label style={lab}>Je naam<input name="name" required style={input} /></label>
        <label style={lab}>Telefoon<input name="phone" type="tel" required placeholder="06 12345678" style={input} /></label>
        <label style={lab}>E-mail<input name="email" type="email" required style={input} /></label>
        <label style={lab}>Hoe wil je benaderd worden?
          <select name="contact_pref" style={input}><option value="bellen">Bellen</option><option value="whatsapp">WhatsApp</option><option value="mail">E-mail</option></select>
        </label>
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "var(--ink-2)" }}><input type="checkbox" name="akkoord" required style={{ marginTop: 4 }} /> Ik ga akkoord dat mijn aanvraag en foto's naar {name} worden gestuurd. {v.brand} verkoopt aanvragen niet door en stuurt ze niet naar andere bedrijven.</label>
      <button className="btn btn-primary" type="submit" style={{ fontSize: 17, minHeight: 52, alignSelf: "flex-start" }}>Verstuur aanvraag naar {name}</button>
    </form>
  );
}
