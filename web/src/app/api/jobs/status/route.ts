import { NextResponse } from "next/server";
import { one } from "@/lib/db";
import { authorized } from "@/lib/jobs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (!authorized(req)) return new NextResponse("nee", { status: 403 });
  const s = await one(`select
    (select count(*)::int from businesses where source='kvk' and status<>'hidden') as bedrijven,
    (select count(*)::int from businesses where source='kvk' and website is not null) as met_website,
    (select count(*)::int from businesses where source='kvk' and website is null and website_checked_at is null) as nog_te_zoeken,
    (select count(*)::int from businesses where profile_built_at is not null) as gebouwd,
    (select count(*)::int from businesses where profile_build_error is not null) as bouwfout,
    (select count(*)::int from businesses where outreach_email is not null and profile_built_at is not null and status='unclaimed') as mailbaar,
    (select count(*)::int from businesses where status in ('claimed','pro')) as betaald,
    (select count(*)::int from businesses where owner_user_id is not null and status='unclaimed') as geclaimd_onbetaald,
    (select count(*)::int from outreach) as mails_verstuurd,
    (select count(*)::int from lead_requests) as aanvragen,
    (select value from settings where key='outreach_enabled') as campagne`);
  return NextResponse.json(s);
}
