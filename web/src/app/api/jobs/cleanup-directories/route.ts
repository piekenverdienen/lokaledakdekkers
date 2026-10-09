import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { authorized } from "@/lib/jobs";
import { DIRECTORY_DOMAINS } from "@/lib/directories";
export const dynamic = "force-dynamic";
// Bedrijven waarvan de "website" een gidssite is (of een domein dat bij 3+ bedrijven voorkomt): website, logo, overgenomen foto's, mailadres en opgebouwde tekst weg; nooit meer mailen.
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const hostExpr = "lower(regexp_replace(regexp_replace(b.website, '^https?://(www\\.)?', ''), '[/:?#].*$', ''))";
  const bad = await q<{ id: string; name: string; website: string; outreach_email: string | null; logo_url: string | null }>(`
    with h as (select b.id, ${hostExpr} as host from businesses b where b.website is not null),
    shared as (select host from h group by host having count(*) >= 3)
    select b.id, b.name, b.website, b.outreach_email, b.logo_url from businesses b join h on h.id=b.id
    where b.source<>'test' and (h.host = any($1::text[]) or exists (select 1 from unnest($1::text[]) d where h.host like '%.' || d) or h.host in (select host from shared))`, [DIRECTORY_DOMAINS]);
  for (const b of bad) {
    await q(`update businesses set website=null, website_source='gidssite-verwijderd', logo_url=case when logo_url like '/media/%' then logo_url else null end,
      description=case when owner_user_id is null then null else description end, outreach_email=null, outreach_opt_out=true,
      outreach_opt_out_at=coalesce(outreach_opt_out_at, now()), outreach_opt_out_via=coalesce(outreach_opt_out_via, 'gidssite'), profile_built_at=null, updated_at=now() where id=$1`, [b.id]);
    await q("delete from business_photos where business_id=$1 and url not like '/media/%'", [b.id]);
    await q("delete from business_services where business_id=$1 and (select owner_user_id from businesses where id=$1) is null", [b.id]);
  }
  // mailadressen op een gidsdomein nooit gebruiken
  const mails = await q<{ id: string }>(`update businesses b set outreach_email=null where outreach_email is not null and (split_part(lower(outreach_email),'@',2) = any($1::text[])) returning id`, [DIRECTORY_DOMAINS]);
  return NextResponse.json({ ok: true, opgeschoond: bad.length, mailadressen: mails.length, voorbeelden: bad.slice(0, 12).map((b) => `${b.name} | ${b.website} | ${b.outreach_email ?? "-"}`) });
}
