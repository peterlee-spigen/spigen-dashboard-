import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface SpRow {
  date: string;
  campaign_id: string;
  campaign_name: string;
  status: string;
  budget_amount: number;
  budget_type: string;
  impressions: number;
  clicks: number;
  cost: number;
  sales_1d: number;
  sales_7d: number;
  sales_14d: number;
  sales_30d: number;
  purchases_14d: number;
  units_sold_14d: number;
  top_of_search_impression_share: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSpRow(raw: Record<string, any>): SpRow | null {
  const date = normalizeDate(raw.date);
  if (!date || !raw.campaignId) return null;

  return {
    date,
    campaign_id: String(raw.campaignId),
    campaign_name: raw.campaignName ?? "",
    status: raw.campaignStatus ?? "",
    budget_amount: parseFloat_(raw.campaignBudgetAmount),
    budget_type: raw.campaignBudgetType ?? "",
    impressions: parseInt_(raw.impressions),
    clicks: parseInt_(raw.clicks),
    cost: parseFloat_(raw.cost),
    sales_1d: parseFloat_(raw.sales1d),
    sales_7d: parseFloat_(raw.sales7d),
    sales_14d: parseFloat_(raw.sales14d),
    sales_30d: parseFloat_(raw.sales30d),
    purchases_14d: parseInt_(raw.purchases14d),
    units_sold_14d: parseInt_(raw.unitsSoldClicks14d),
    top_of_search_impression_share:
      raw.topOfSearchImpressionShare !== "" && raw.topOfSearchImpressionShare != null
        ? parseFloat_(raw.topOfSearchImpressionShare)
        : null,
  };
}
