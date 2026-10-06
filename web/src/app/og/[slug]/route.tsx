import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getBusiness, one } from "@/lib/db";
import { currentVertical } from "@/lib/site";
export const dynamic = "force-dynamic";
// Deelafbeelding per bedrijf: "Geverifieerd bedrijf op lokaledakdekkers.nl", 1200x630.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const v = await currentVertical();
  const b = await getBusiness(slug, v.id);
  if (!b || b.status === "hidden") return new Response("niet gevonden", { status: 404 });
  const claimed = b.status !== "unclaimed" || !!b.owner_user_id;
  const ab = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  const [bold, regular] = (await Promise.all([readFile(path.join(process.cwd(), "public/fonts/DejaVuSans-Bold.ttf")), readFile(path.join(process.cwd(), "public/fonts/DejaVuSans.ttf"))])).map(ab);
  let logo: string | null = null;
  if (b.logo_url?.startsWith("/media/")) {
    const m = await one<{ mime: string; bytes: Buffer }>("select mime, bytes from media where id=$1", [b.logo_url.replace("/media/", "").replace(/\.[a-z]+$/, "")]).catch(() => null);
    if (m) { try { const sharp = (await import("sharp")).default; const png = await sharp(Buffer.from(m.bytes)).resize({ width: 264, height: 264, fit: "inside" }).png().toBuffer(); logo = `data:image/png;base64,${png.toString("base64")}`; } catch { logo = null; } }
  }
  const name = b.name.length > 34 ? b.name.slice(0, 33) + "…" : b.name;
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#142E3A", color: "#F5F1E9", fontFamily: "DejaVu", padding: 64, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#F5F1E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none"><path d="M2 30l9-10 9 10" stroke="#142E3A" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 28l9-12 9 12" stroke="#C76B46" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M28 30l9-10 9 10" stroke="#142E3A" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}><span style={{ fontSize: 30, fontWeight: 700 }}>{v.brand}</span><span style={{ fontSize: 16, color: "#F2B33D", }}>Weet wie je het dak op laat.</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {logo && <div style={{ width: 160, height: 160, borderRadius: 24, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}><img src={logo} width={132} height={132} style={{ objectFit: "contain" }} /></div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: 58, fontWeight: 700, lineHeight: 1.1 }}>{name}</span>
            <span style={{ fontSize: 28, color: "#D6DEE2" }}>{v.name_singular.charAt(0).toUpperCase() + v.name_singular.slice(1)}{b.city ? ` in ${b.city}` : ""}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {claimed ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#1B6B3A", borderRadius: 999, padding: "14px 28px", fontSize: 28, fontWeight: 700 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>Geverifieerd bedrijf
            </div>
          ) : <div style={{ fontSize: 26, color: "#D6DEE2" }}>Bedrijfsprofiel</div>}
          <span style={{ fontSize: 26, color: "#E2B59E", marginLeft: "auto" }}>{v.domain}/bedrijf/{slug}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: "DejaVu", data: bold, weight: 700, style: "normal" }, { name: "DejaVu", data: regular, weight: 400, style: "normal" }] },
  );
}
