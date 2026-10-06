import { one, q, type Vertical } from "./db";
import { mailLayout, sendMail } from "./auth";
import { revalidatePath } from "next/cache";
// Zet een bedrijf online na een geslaagde betaling (Mollie of bank), maakt het factuurnummer en stuurt de factuurmail.
export async function activateAfterPayment(v: Vertical, businessId: string, paymentId: string, base: string) {
  await q(`update businesses set status=case when status='pro' then status else 'claimed' end, reviewed=true, verified_at=coalesce(verified_at, now()),
           paid_until=greatest(coalesce(paid_until, current_date), current_date) + interval '1 year', renewal_mailed_at=null, updated_at=now() where id=$1`, [businessId]);
  await q("refresh materialized view place_stats").catch(() => {});
  revalidatePath("/", "layout");
  const inv = await one<{ id: string; invoice_no: number }>("update payments set status='paid', paid_at=coalesce(paid_at, now()), invoice_no=coalesce(invoice_no, nextval('invoice_seq')) where id=$1 returning id, invoice_no", [paymentId]);
  const bz = await one<{ name: string; slug: string; email: string | null; paid_until: string }>("select b.name, b.slug, coalesce(u.email, b.email) as email, b.paid_until::text from businesses b left join users u on u.id=b.owner_user_id where b.id=$1", [businessId]);
  if (bz?.email && inv) {
    await sendMail(bz.email, `Je profiel staat online, factuur ${inv.invoice_no}`, mailLayout(v.brand, `${bz.name} staat online`, `<p>Je profiel is online met het label Geverifieerd, tot ${bz.paid_until}. Dertig dagen voor die datum krijg je een mail om te verlengen; er wordt niets automatisch afgeschreven.</p><p>Je factuur met btw-specificatie staat in je dashboard en via de knop hieronder (afdrukken of opslaan als pdf met Ctrl+P).</p>`, { href: `${base}/factuur/${inv.id}/`, label: `Factuur ${inv.invoice_no} bekijken` }), `Je profiel staat online tot ${bz.paid_until}. Factuur: ${base}/factuur/${inv.id}/`).catch(() => {});
    await q("update payments set invoice_sent_at=now() where id=$1", [inv.id]);
  }
}
