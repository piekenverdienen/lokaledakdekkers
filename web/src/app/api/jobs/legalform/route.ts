import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { authorized } from "@/lib/jobs";
export const dynamic = "force-dynamic"; export const maxDuration = 60;
// Rechtsvorm per bedrijf ophalen (overheid.io), voor de mailregels: rechtspersonen mogen gemaild, eenmanszaak en vof alleen met toestemming.
const NATUURLIJK = /eenmanszaak|vennootschap onder firma|\bvof\b|maatschap|commanditaire|\bcv\b|natuurlijk persoon/i;
const RECHTSPERSOON = /besloten vennootschap|\bb\.?v\b|naamloze vennootschap|\bn\.?v\b|co[oö]peratie|stichting|vereniging|rechtspersoon/i;
function classify(f: string | null) { if (!f) return null; if (NATUURLIJK.test(f)) return "natuurlijk"; if (RECHTSPERSOON.test(f)) return "rechtspersoon"; return null; }
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const key = process.env.OVERHEID_IO_KEY; if (!key) return NextResponse.json({ ok: false, reden: "geen OVERHEID_IO_KEY" });
  const rows = await q<{ id: string; kvk_slug: string }>("select id, kvk_slug from businesses where source='kvk' and kvk_slug is not null and legal_checked_at is null and legal_class is null order by (outreach_email is not null) desc, id limit 25");
  let done = 0, sample: string | null = null;
  for (const r of rows) {
    try {
      const res = await fetch(`https://api.overheid.io/v3/openkvk/${r.kvk_slug}`, { headers: { "ovio-api-key": key, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
      if (res.status === 429) break;
      const d = res.ok ? await res.json() as Record<string, unknown> : {};
      const raw = d.rechtsvorm ?? d.rechtsvormOmschrijving ?? d.rechtsvormUitgebreid ?? d.type ?? (d.rechtsvormen as unknown[] | undefined)?.[0] ?? null;
      const form = raw ? (typeof raw === "string" ? raw : String((raw as Record<string, unknown>).omschrijving ?? (raw as Record<string, unknown>).naam ?? JSON.stringify(raw))) : null;
      if (!sample) sample = `${form ?? "geen"} | velden: ${Object.keys(d).slice(0, 25).join(",")}`;
      await q("update businesses set legal_form=$2, legal_class=$3, legal_checked_at=now() where id=$1", [r.id, form, classify(form)]);
      done++;
    } catch { await q("update businesses set legal_checked_at=now() where id=$1", [r.id]); }
    await new Promise((x) => setTimeout(x, 150));
  }
  const left = (await one<{ n: number }>("select count(*)::int as n from businesses where source='kvk' and kvk_slug is not null and legal_checked_at is null and legal_class is null"))?.n ?? 0;
  return NextResponse.json({ ok: true, done, left, sample });
}
