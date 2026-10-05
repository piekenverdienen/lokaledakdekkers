import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { getPayment } from "@/lib/mollie";
import { revalidatePath } from "next/cache";

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
  }
  return new NextResponse("ok");
}
