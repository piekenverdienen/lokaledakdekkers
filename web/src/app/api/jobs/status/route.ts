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
    (select value from settings where key='outreach_enabled') as campagne,
    (select count(*)::int from businesses where website ilike '%oozo%' or logo_url ilike '%oozo%' or outreach_email ilike '%oozo%' or description ilike '%oozo%') as oozo_bedrijven,
    (select count(*)::int from business_photos where url ilike '%oozo%') as oozo_fotos,
    (select count(*)::int from outreach where opened_at is not null) as geopend,
    (select count(*)::int from outreach where clicked_at is not null) as geklikt,
    (select count(*)::int from outreach where clicked_at is not null and clicked_at < sent_at + interval '2 minutes') as klik_binnen_2min,
    (select count(*)::int from outreach where opened_at is not null and opened_at < sent_at + interval '2 minutes') as open_binnen_2min,
    (select count(*)::int from outreach where clicked_at is not null and opened_at is null) as klik_zonder_open,
    (select count(*)::int from businesses where outreach_opt_out) as afgemeld,
    (select json_agg(x) from (select coalesce(outreach_opt_out_via,'oud (voor fix)') as via, count(*) as n from businesses where outreach_opt_out group by 1) x) as afgemeld_via,
    (select count(*)::int from outreach o join businesses b on b.id=o.business_id where b.owner_user_id is not null) as geclaimd_na_mail,
    (select json_agg(x) from (select coalesce(variant,'A') as v, count(*) as n, count(opened_at) as open, count(clicked_at) as klik from outreach where kind='claim' group by 1) x) as ab,
    (select json_agg(x) from (select split_part(o.email,'@',2) as domein, count(*) as n from outreach o join businesses b on b.id=o.business_id where b.website_source='blocked-directory' group by 1 order by 2 desc) x) as mail_naar_gidsen,
    (select count(*)::int from businesses where website_source='blocked-directory') as gids_opgeschoond,
    (select json_agg(x) from (select p.name, p.slug, m.slug as gemeente, round(st_y(p.geom)::numeric,3) as lat, round(st_x(p.geom)::numeric,3) as lng, p.population, ps.business_count,
       (select count(*) from businesses b where b.geom is not null and st_dwithin(b.geom::geography, p.geom::geography, 4000)) as binnen_4km,
       (select count(*) from businesses b where lower(b.city)=lower(p.name)) as stad_gelijk
       from places p join municipalities m on m.id=p.municipality_id left join place_stats ps on ps.place_id=p.id where p.name in ('Helmond','Bergen op Zoom','Eindhoven')) x) as diag,
    (select json_agg(x) from (select round(extract(epoch from (clicked_at - sent_at))/60) as min, count(*) as n from outreach where clicked_at is not null group by 1 order by 1 limit 15) x) as klik_minuten`);
  return NextResponse.json(s);
}
