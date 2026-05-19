import { getTable } from "@/lib/local-store";

export interface ChannelRow {
  type: string;
  cost_type: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  cost: number;
  sales_14d: number;
  roas: number | null;
  cpc: number | null;
  new_to_brand_sales: number;
}

export interface CampaignRow {
  campaign_id: string;
  campaign_name: string;
  type: string;
  status: string;
  budget_amount: number;
  budget_type: string;
  cost: number;
  sales_14d: number;
  roas: number | null;
  clicks: number;
  top_of_search_impression_share: number | null;
}

export interface AttributionRow {
  product_asin: string;
  product_name: string;
  publisher: string;
  attributed_sales_14d: number;
  attributed_purchases_14d: number;
  brand_halo_sales_14d: number;
  new_to_brand_sales_14d: number;
  new_to_brand_purchases_14d: number;
}

interface AdCampaign {
  date: string; type: string; cost_type: string; campaign_id: string; campaign_name: string;
  status: string; budget_amount: number; budget_type: string;
  impressions: number; clicks: number; cost: number;
  sales_14d: number; new_to_brand_sales: number;
  meta?: { top_of_search_impression_share?: number | null };
}
interface AttributionStored {
  date: string; campaign_id: string; product_asin: string; product_name: string; publisher: string;
  attributed_sales_14d: number; attributed_purchases_14d: number;
  brand_halo_sales_14d: number;
  new_to_brand_sales_14d: number; new_to_brand_purchases_14d: number;
}

function inRange(d: string, from: string, to: string) { return d >= from && d <= to; }

export async function getChannelComparison(dateFrom: string, dateTo: string, types: string[]): Promise<ChannelRow[]> {
  const typeSet = new Set(types);
  const rows = (await getTable<AdCampaign>("ad_campaigns"))
    .filter((r) => inRange(r.date, dateFrom, dateTo) && typeSet.has(r.type));

  const grouped = new Map<string, ChannelRow>();
  for (const r of rows) {
    const key = `${r.type}|${r.cost_type ?? ""}`;
    let cur = grouped.get(key);
    if (!cur) {
      cur = {
        type: r.type, cost_type: r.cost_type ?? "",
        impressions: 0, clicks: 0, ctr: null,
        cost: 0, sales_14d: 0, roas: null, cpc: null,
        new_to_brand_sales: 0,
      };
      grouped.set(key, cur);
    }
    cur.impressions += r.impressions ?? 0;
    cur.clicks += r.clicks ?? 0;
    cur.cost += r.cost ?? 0;
    cur.sales_14d += r.sales_14d ?? 0;
    cur.new_to_brand_sales += r.new_to_brand_sales ?? 0;
  }

  const result = Array.from(grouped.values()).map((c) => ({
    ...c,
    ctr: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 10000) / 100 : null,
    roas: c.cost > 0 ? Math.round((c.sales_14d / c.cost) * 100) / 100 : null,
    cpc: c.clicks > 0 ? Math.round((c.cost / c.clicks) * 100) / 100 : null,
  }));
  result.sort((a, b) => a.type.localeCompare(b.type) || a.cost_type.localeCompare(b.cost_type));
  return result;
}

export async function getCampaigns(
  dateFrom: string,
  dateTo: string,
  types: string[],
  status?: string,
): Promise<CampaignRow[]> {
  const typeSet = new Set(types);
  const wantStatus = status && status !== "ALL" ? status : null;
  const rows = (await getTable<AdCampaign>("ad_campaigns")).filter((r) => {
    if (!inRange(r.date, dateFrom, dateTo)) return false;
    if (!typeSet.has(r.type)) return false;
    if (wantStatus && r.status !== wantStatus) return false;
    return true;
  });

  const grouped = new Map<string, {
    base: AdCampaign;
    cost: number; sales: number; clicks: number;
    tosSum: number; tosCount: number;
  }>();
  for (const r of rows) {
    let cur = grouped.get(r.campaign_id);
    if (!cur) {
      cur = { base: r, cost: 0, sales: 0, clicks: 0, tosSum: 0, tosCount: 0 };
      grouped.set(r.campaign_id, cur);
    }
    cur.cost += r.cost ?? 0;
    cur.sales += r.sales_14d ?? 0;
    cur.clicks += r.clicks ?? 0;
    const tos = r.meta?.top_of_search_impression_share;
    if (typeof tos === "number") {
      cur.tosSum += tos;
      cur.tosCount += 1;
    }
  }

  const result: CampaignRow[] = Array.from(grouped.entries()).map(([campaign_id, v]) => ({
    campaign_id,
    campaign_name: v.base.campaign_name ?? "",
    type: v.base.type,
    status: v.base.status ?? "",
    budget_amount: v.base.budget_amount ?? 0,
    budget_type: v.base.budget_type ?? "",
    cost: v.cost,
    sales_14d: v.sales,
    roas: v.cost > 0 ? Math.round((v.sales / v.cost) * 100) / 100 : null,
    clicks: v.clicks,
    top_of_search_impression_share: v.tosCount > 0 ? v.tosSum / v.tosCount : null,
  }));

  result.sort((a, b) => {
    if (a.roas === null && b.roas === null) return 0;
    if (a.roas === null) return 1;
    if (b.roas === null) return -1;
    return b.roas - a.roas;
  });
  return result;
}

export async function getAttributionByAsin(dateFrom: string, dateTo: string): Promise<AttributionRow[]> {
  const rows = (await getTable<AttributionStored>("attribution")).filter((r) => inRange(r.date, dateFrom, dateTo));
  const grouped = new Map<string, AttributionRow>();
  for (const r of rows) {
    const key = `${r.product_asin}|${r.publisher}`;
    let cur = grouped.get(key);
    if (!cur) {
      cur = {
        product_asin: r.product_asin,
        product_name: r.product_name ?? "",
        publisher: r.publisher ?? "",
        attributed_sales_14d: 0,
        attributed_purchases_14d: 0,
        brand_halo_sales_14d: 0,
        new_to_brand_sales_14d: 0,
        new_to_brand_purchases_14d: 0,
      };
      grouped.set(key, cur);
    }
    cur.attributed_sales_14d += r.attributed_sales_14d ?? 0;
    cur.attributed_purchases_14d += r.attributed_purchases_14d ?? 0;
    cur.brand_halo_sales_14d += r.brand_halo_sales_14d ?? 0;
    cur.new_to_brand_sales_14d += r.new_to_brand_sales_14d ?? 0;
    cur.new_to_brand_purchases_14d += r.new_to_brand_purchases_14d ?? 0;
  }
  const result = Array.from(grouped.values());
  result.sort((a, b) => b.attributed_sales_14d - a.attributed_sales_14d);
  return result;
}
