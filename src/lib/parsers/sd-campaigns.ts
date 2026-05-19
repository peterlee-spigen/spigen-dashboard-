import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface SdRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  budget_amount: number;
  cost_type: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales_14d: number;
  purchases_14d: number;
  units_sold_14d: number;
  new_to_brand_sales: number;
  new_to_brand_purchases: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSdRow(raw: Record<string, any>): SdRow | null {
  const date = normalizeDate(raw.date);
  if (!date || !raw.campaignId) return null;

  return {
    date,
    campaign_id: String(raw.campaignId),
    campaign_name: raw.campaignName ?? "",
    status: raw.campaignStatus ?? "",
    budget_amount: parseFloat_(raw.campaignBudgetAmount),
    cost_type: raw.costType ?? "CPC",
    impressions: parseInt_(raw.impressions),
    clicks: parseInt_(raw.clicks),
    cost: parseFloat_(raw.cost),
    sales_14d: parseFloat_(raw.salesClicks),
    purchases_14d: parseInt_(raw.purchasesClicks),
    units_sold_14d: parseInt_(raw.unitsSoldClicks),
    new_to_brand_sales: parseFloat_(raw.newToBrandSales),
    new_to_brand_purchases: parseInt_(raw.newToBrandPurchases),
  };
}
