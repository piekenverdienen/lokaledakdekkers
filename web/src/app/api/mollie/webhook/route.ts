import { NextResponse } from "next/server";
import { one, q } from "@/lib/db";
import { getPayment } from "@/lib/mollie";
import { getVertical } from "@/lib/db";
import { activateAfterPayment } from "@/lib/activate";

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
    const v = await getVertical(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "");
    const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
    const pay = await one<{ id: string }>("select id from payments where provider_id=$1", [id]);
    if (pay) await activateAfterPayment(v, businessId, pay.id, base).catch(() => {});
  }
  return new NextResponse("ok");
}
