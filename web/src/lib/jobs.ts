import { createHash } from "node:crypto";
export const jobToken = () => createHash("sha256").update("jobs:" + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
export function authorized(req: Request) { return new URL(req.url).searchParams.get("token") === jobToken(); }
