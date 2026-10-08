// Juridische entiteit achter de gids. Te overschrijven via INVOICE_* in de omgeving.
export const COMPANY = {
  name: process.env.INVOICE_SELLER ?? "Rovimed Group B.V.",
  address: process.env.INVOICE_ADDRESS ?? "Postbus 269, 4760 AG Zevenbergen",
  kvk: process.env.INVOICE_KVK ?? "80853285",
  btw: process.env.INVOICE_BTW ?? "",
};
