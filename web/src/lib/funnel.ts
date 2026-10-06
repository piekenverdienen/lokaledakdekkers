import { q } from "./db";
export const SEGMENTS: [string, string, string][] = [
  ["warm", "Warm: geklikt of geclaimd, nog niet betaald", "(o.clicked_at is not null or b.owner_user_id is not null) and b.status not in ('claimed','pro')"],
  ["bank", "Overschrijving gemeld, wacht op ontvangst", "exists (select 1 from payments p where p.business_id=b.id and p.provider='bank' and p.status='open')"],
  ["geclaimd", "Geclaimd, nog niet betaald", "b.owner_user_id is not null and b.status not in ('claimed','pro')"],
  ["geklikt", "Geklikt, nog niet geclaimd", "o.clicked_at is not null and b.owner_user_id is null"],
  ["geopend", "Geopend, niet geklikt", "o.opened_at is not null and o.clicked_at is null and b.owner_user_id is null"],
  ["geen-reactie", "Verstuurd, geen reactie", "o.sent_at is not null and o.opened_at is null and o.clicked_at is null and b.owner_user_id is null and not b.outreach_opt_out"],
  ["betaald", "Betaald en online", "b.status in ('claimed','pro')"],
  ["uitgeschreven", "Uitgeschreven", "b.outreach_opt_out"],
];
export type FunnelRow = { id: string; name: string; slug: string; city: string | null; provincie: string | null; email: string | null; phone: string | null; sent_at: string | null; opened_at: string | null; clicked_at: string | null; reminder_at: string | null; claimed: boolean; status: string; paid_until: string | null; leads: number };
export async function segmentRows(verticalId: number, seg: string, regio: string, limit = 500) {
  const cond = SEGMENTS.find((s) => s[0] === seg)?.[2] ?? SEGMENTS[0][2];
  return q<FunnelRow>(`
    select b.id, b.name, b.slug, b.city, pr.name as provincie, coalesce(u.email, b.outreach_email, b.email) as email, b.phone,
      o.sent_at::text, o.opened_at::text, o.clicked_at::text, o.reminder_at::text, (b.owner_user_id is not null) as claimed, b.status, b.paid_until::text,
      (select count(*)::int from leads l where l.business_id=b.id) as leads
    from businesses b left join outreach o on o.business_id=b.id left join users u on u.id=b.owner_user_id
    left join municipalities m on m.id=b.municipality_id left join provinces pr on pr.id=m.province_id
    where b.vertical_id=$1 and b.source<>'test' and (${cond}) and ($2='' or lower(pr.slug)=lower($2))
    order by greatest(o.clicked_at, o.opened_at, o.sent_at) desc nulls last, b.name limit $3`, [verticalId, regio, limit]);
}
