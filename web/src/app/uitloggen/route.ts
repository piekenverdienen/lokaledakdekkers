import { NextResponse } from "next/server";
export async function GET(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const res = NextResponse.redirect(process.env.BASE_URL_OVERRIDE ?? `https://${host}/`, 303);
  res.cookies.set({ name: "lk_session", value: "", path: "/", maxAge: 0 });
  return res;
}
