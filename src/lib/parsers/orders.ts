import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface OrderRow {
  order_id: string;
  purchase_date: string;
  asin: string;
  sku: string;
  quantity: number;
  item_price: number;
  ship_country: string;
  fulfillment_channel: string;
  order_status: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseOrderRow(raw: Record<string, any>): OrderRow | null {
  const purchase_date = normalizeDate(raw["purchase-date"]);
  if (!purchase_date) return null;

  return {
    order_id: raw["amazon-order-id"] ?? "",
    purchase_date,
    asin: raw.asin ?? "",
    sku: raw.sku ?? "",
    quantity: parseInt_(raw.quantity),
    item_price: parseFloat_(raw["item-price"]),
    ship_country: raw["ship-country"] ?? "",
    fulfillment_channel: raw["fulfillment-channel"] ?? "",
    order_status: raw["order-status"] ?? "",
  };
}
