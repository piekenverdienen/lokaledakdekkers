const KEY = () => process.env.MOLLIE_API_KEY;
export const mollieEnabled = () => !!KEY();

export async function createPayment(opts: { amountCents: number; description: string; redirectUrl: string; webhookUrl: string; metadata: Record<string, string> }) {
  const r = await fetch("https://api.mollie.com/v2/payments", {
    method: "POST", headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: { currency: "EUR", value: (opts.amountCents / 100).toFixed(2) },
      description: opts.description, redirectUrl: opts.redirectUrl, webhookUrl: opts.webhookUrl, metadata: opts.metadata, locale: "nl_NL",
    }),
  });
  if (!r.ok) throw new Error(`mollie ${r.status}: ${await r.text()}`);
  return r.json() as Promise<{ id: string; status: string; _links: { checkout: { href: string } } }>;
}

export async function getPayment(id: string) {
  const r = await fetch(`https://api.mollie.com/v2/payments/${id}`, { headers: { Authorization: `Bearer ${KEY()}` } });
  if (!r.ok) throw new Error(`mollie ${r.status}`);
  return r.json() as Promise<{ id: string; status: string; paidAt?: string; metadata?: Record<string, string>; details?: { consumerName?: string } }>;
}

// Heeft Mollie op dit moment een betaalmethode actief voor dit account? (10 minuten in het geheugen)
let methodsCache: { at: number; ok: boolean } | null = null;
export async function mollieMethodsAvailable(): Promise<boolean> {
  if (!mollieEnabled()) return false;
  if (methodsCache && Date.now() - methodsCache.at < 600000) return methodsCache.ok;
  try {
    const r = await fetch("https://api.mollie.com/v2/methods?amount[value]=79.95&amount[currency]=EUR", { headers: { Authorization: `Bearer ${KEY()}` }, signal: AbortSignal.timeout(5000) });
    const j = r.ok ? await r.json() : null;
    const ok = !!j && (j.count ?? j._embedded?.methods?.length ?? 0) > 0;
    methodsCache = { at: Date.now(), ok }; return ok;
  } catch { methodsCache = { at: Date.now(), ok: false }; return false; }
}
