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
