import { parseFloat_ } from "./normalize-date";

export interface ListingRow {
  asin: string;
  sku: string;
  item_name: string;
  price: number;
  status: string;
  fulfillment_channel: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseListingRow(raw: Record<string, any>): ListingRow | null {
  const asin = raw.asin1 ?? "";
  if (!asin) return null;

  return {
    asin,
    sku: raw["seller-sku"] ?? "",
    item_name: raw["item-name"] ?? "",
    price: parseFloat_(raw.price),
    status: raw.status ?? "",
    fulfillment_channel: raw["fulfillment-channel"] ?? "",
  };
}
