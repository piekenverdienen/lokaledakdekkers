// Achtergrondworker in de container: roept de jobs aan via de eigen server. Profielen bouwen, campagne, verlenging.
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
const token = createHash("sha256").update("jobs:" + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
const base = "http://127.0.0.1:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (path) => { try { const r = await fetch(`${base}${path}${path.includes("?") ? "&" : "?"}token=${token}`, { headers: { host: process.env.PUBLIC_HOST ?? "lokaledakdekkers.nl" } }); const j = await r.json().catch(() => ({})); return j; } catch (e) { return { error: String(e.message) }; } };
await sleep(20000);
console.log("status: " + JSON.stringify(await call("/api/jobs/status/")));
let tick = 0;
for (;;) {
  tick++;
  const lf = await call("/api/jobs/legalform/");
  if (lf?.done) console.log(`rechtsvorm: ${lf.done} gecontroleerd, ${lf.left} te gaan${lf.sample ? `, voorbeeld: ${lf.sample}` : ""}`);
  const pb = await call("/api/jobs/prebuild/?limit=4");
  if (pb?.built || pb?.failed) console.log(`prebuild: ${pb.built} gebouwd, ${pb.failed} mislukt, ${pb.left} te gaan`);
  if (tick % 5 === 0) { const o = await call("/api/jobs/outreach/"); if (o?.sent || o?.reminders) console.log(`campagne: ${o.sent} mails, ${o.reminders} herinneringen, vandaag ${o.sentToday} van ${o.perDay}`); }
  if (tick % 60 === 1) { const r = await call("/api/jobs/renewal/"); if (r?.mailed || r?.expired) console.log(`verlenging: ${r.mailed} mails, ${r.expired} verlopen`); }
  if (tick % 60 === 3) console.log("status: " + JSON.stringify(await call("/api/jobs/status/")));
  if (tick % 60 === 2) { const w = await call("/api/jobs/weekly/"); if (w?.mailed) console.log(`weekoverzicht: ${w.mailed} mails`); }
  // websitezoeker elke 6 uur opnieuw proberen (pakt verder op zodra er Serper-credits zijn)
  if (tick % 480 === 10 && process.env.SERPER_API_KEY) { console.log("website-zoeker: opnieuw starten"); spawn(process.execPath, ["scripts/find-websites.mjs"], { stdio: "inherit" }); }
  await sleep(pb?.left || lf?.left ? 45000 : 300000);
}
