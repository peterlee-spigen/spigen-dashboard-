import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface InventoryRow {
  report_date: string;
  sku: string;
  asin: string;
  product_name: string;
  your_price: number;
  afn_fulfillable: number;
  afn_reserved: number;
  afn_inbound_total: number;
  afn_total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseInventoryRow(raw: Record<string, any>): InventoryRow | null {
  const report_date = normalizeDate(raw.report_date);
  if (!report_date || !raw.sku) return null;

  const inbound =
    parseInt_(raw["afn-inbound-working-quantity"]) +
    parseInt_(raw["afn-inbound-shipped-quantity"]) +
    parseInt_(raw["afn-inbound-receiving-quantity"]);

  return {
    report_date,
    sku: String(raw.sku),
    asin: raw.asin ?? "",
    product_name: raw["product-name"] ?? "",
    your_price: parseFloat_(raw["your-price"]),
    afn_fulfillable: parseInt_(raw["afn-fulfillable-quantity"]),
    afn_reserved: parseInt_(raw["afn-reserved-quantity"]),
    afn_inbound_total: inbound,
    afn_total: parseInt_(raw["afn-total-quantity"]),
  };
}
