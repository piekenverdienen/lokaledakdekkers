import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { getPayment } from "@/lib/mollie";
import { revalidatePath } from "next/cache";
import { mailLayout, sendMail } from "@/lib/auth";
import { getVertical } from "@/lib/db";

export async function POST(req: Request) {
  const f = await req.formData().catch(() => null);
  const id = String(f?.get("id") ?? "");
  if (!id) return new NextResponse("missing id", { status: 400 });
  const p = await getPayment(id).catch(() => null);
  if (!p) return new NextResponse("ok");
  const row = await one<{ business_id: string; status: string }>("select business_id, status from payments where provider_id=$1", [id]);
  const businessId = row?.business_id ?? p.metadata?.business_id;
  await q("update payments set status=$2, paid_at=case when $2='paid' then now() else paid_at end, consumer_name=$3 where provider_id=$1", [id, p.status, p.details?.consumerName ?? null]);
  if (p.status === "paid" && businessId && row?.status !== "paid") {
    await q(`update businesses set status=case when status='pro' then status else 'claimed' end, reviewed=true, verified_at=coalesce(verified_at, now()),
             paid_until=greatest(coalesce(paid_until, current_date), current_date) + interval '1 year', updated_at=now() where id=$1`, [businessId]);
    await q("refresh materialized view place_stats").catch(() => {});
    revalidatePath("/", "layout");
    try {
      const inv = await one<{ id: string; invoice_no: number }>("update payments set invoice_no=coalesce(invoice_no, nextval('invoice_seq')) where provider_id=$1 returning id, invoice_no", [id]);
      const bz = await one<{ name: string; slug: string; email: string | null; paid_until: string }>("select b.name, b.slug, coalesce(u.email, b.email) as email, b.paid_until::text from businesses b left join users u on u.id=b.owner_user_id where b.id=$1", [businessId]);
      const v = await getVertical(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
      const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
      if (bz?.email && inv) {
        await sendMail(bz.email, `Je profiel staat online, factuur ${inv.invoice_no}`, mailLayout(v.brand, `${bz.name} staat online`, `<p>Je profiel is online met het label Geverifieerd, tot ${bz.paid_until}. Dertig dagen voor die datum krijg je een mail om te verlengen; er wordt niets automatisch afgeschreven.</p><p>Je factuur met btw-specificatie staat in je dashboard en via de knop hieronder (afdrukken of opslaan als pdf met Ctrl+P).</p>`, { href: `${base}/factuur/${inv.id}/`, label: `Factuur ${inv.invoice_no} bekijken` }), `Je profiel staat online tot ${bz.paid_until}. Factuur: ${base}/factuur/${inv.id}/`);
        await q("update payments set invoice_sent_at=now() where id=$1", [inv.id]);
      }
    } catch { /* factuurmail is best-effort */ }
  }
  return new NextResponse("ok");
}
