import { getVertical, one } from "./db";
import { getUser } from "./auth";

export async function ownedBusiness(req: Request, slug: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const v = await getVertical(host);
  const base = process.env.BASE_URL_OVERRIDE ?? `https://${v.domain}`;
  const user = await getUser();
  if (!user) return { v, base, user: null, b: null };
  const b = await one<{ id: string; owner_user_id: string | null; status: string; city: string | null; name: string; website: string | null }>(
    "select id, owner_user_id, status, city, name, website from businesses where vertical_id=$1 and slug=$2", [v.id, slug]);
  if (!b || (!user.is_admin && b.owner_user_id !== user.id)) return { v, base, user, b: null };
  return { v, base, user, b };
}
