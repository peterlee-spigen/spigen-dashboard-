import { getTable } from "@/lib/local-store";
import { calcDelta } from "@/lib/date-utils";

export interface SummaryDeltas {
  revenue: number | null;
  adSpend: number | null;
  roas: number | null;
  clicks: number | null;
  ctr: number | null;
  buyBox: number | null;
}

export interface SummaryData {
  totalRevenue: number;
  totalAdSpend: number;
  roas: number | null;
  totalClicks: number;
  avgCtr: number | null;
  avgBuyBox: number | null;
  dailyTrend: { date: string; revenue: number; adSpend: number }[];
  roasByChannel: { channel: string; roas: number | null; spend: number; sales: number }[];
  deltas: SummaryDeltas | null;
}

interface OrderRow { purchase_date: string; item_price: number; quantity: number; asin: string; ship_country: string }
interface AdCampaignRow {
  date: string; type: string; cost_type?: string; campaign_id: string; campaign_name?: string; status?: string;
  budget_amount?: number; budget_type?: string;
  impressions: number; clicks: number; cost: number;
  sales_14d: number;
  purchases_14d?: number; units_sold_14d?: number;
  new_to_brand_sales?: number; new_to_brand_purchases?: number;
  meta?: { sales_1d?: number; sales_7d?: number; sales_30d?: number; top_of_search_impression_share?: number | null };
}
interface TrafficRow { report_date: string; child_asin: string; buy_box_percentage: number }

function inRange(d: string, from: string, to: string) {
  return d >= from && d <= to;
}

function aggregatePeriod(
  allOrders: OrderRow[],
  allAds: AdCampaignRow[],
  allTraffic: TrafficRow[],
  from: string,
  to: string,
) {
  const orders = allOrders.filter((o) => inRange(o.purchase_date, from, to));
  const ads = allAds.filter((a) => inRange(a.date, from, to));
  const traffic = allTraffic.filter((t) => inRange(t.report_date, from, to));

  const totalRevenue = orders.reduce((s, o) => s + (o.item_price ?? 0) * (o.quantity ?? 0), 0);
  const totalAdSpend = ads.reduce((s, a) => s + (a.cost ?? 0), 0);
  const totalClicks = ads.reduce((s, a) => s + (a.clicks ?? 0), 0);
  const totalImpressions = ads.reduce((s, a) => s + (a.impressions ?? 0), 0);
  const totalAdSales = ads.reduce((s, a) => s + (a.sales_14d ?? 0), 0);
  const avgBuyBox = traffic.length > 0
    ? traffic.reduce((s, t) => s + (t.buy_box_percentage ?? 0), 0) / traffic.length
    : null;
  const roas = totalAdSpend > 0 ? Math.round((totalAdSales / totalAdSpend) * 100) / 100 : null;
  const avgCtr = totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : null;

  return { orders, ads, totalRevenue, totalAdSpend, totalClicks, totalImpressions, totalAdSales, avgBuyBox, roas, avgCtr };
}

export async function getSummary(
  dateFrom: string,
  dateTo: string,
  prevFrom?: string,
  prevTo?: string,
): Promise<SummaryData> {
  const [allOrders, allAds, allTraffic] = await Promise.all([
    getTable<OrderRow>("orders"),
    getTable<AdCampaignRow>("ad_campaigns"),
    getTable<TrafficRow>("traffic"),
  ]);

  const cur = aggregatePeriod(allOrders, allAds, allTraffic, dateFrom, dateTo);

  const dateSet = new Set<string>();
  for (const o of cur.orders) dateSet.add(o.purchase_date);
  for (const a of cur.ads) dateSet.add(a.date);
  const dailyTrend = Array.from(dateSet).sort().map((date) => {
    const revenue = cur.orders
      .filter((o) => o.purchase_date === date)
      .reduce((s, o) => s + (o.item_price ?? 0) * (o.quantity ?? 0), 0);
    const adSpend = cur.ads.filter((a) => a.date === date).reduce((s, a) => s + (a.cost ?? 0), 0);
    return { date, revenue, adSpend };
  });

  const byChannel = new Map<string, { spend: number; sales: number }>();
  for (const a of cur.ads) {
    const ch = byChannel.get(a.type) ?? { spend: 0, sales: 0 };
    ch.spend += a.cost ?? 0;
    ch.sales += a.sales_14d ?? 0;
    byChannel.set(a.type, ch);
  }
  const roasByChannel = Array.from(byChannel.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([channel, v]) => ({
      channel,
      spend: v.spend,
      sales: v.sales,
      roas: v.spend > 0 ? Math.round((v.sales / v.spend) * 100) / 100 : null,
    }));

  let deltas: SummaryDeltas | null = null;
  if (prevFrom && prevTo) {
    const prev = aggregatePeriod(allOrders, allAds, allTraffic, prevFrom, prevTo);
    deltas = {
      revenue: calcDelta(cur.totalRevenue, prev.totalRevenue),
      adSpend: calcDelta(cur.totalAdSpend, prev.totalAdSpend),
      roas: cur.roas !== null && prev.roas !== null ? calcDelta(cur.roas, prev.roas) : null,
      clicks: calcDelta(cur.totalClicks, prev.totalClicks),
      ctr: cur.avgCtr !== null && prev.avgCtr !== null ? calcDelta(cur.avgCtr, prev.avgCtr) : null,
      buyBox: cur.avgBuyBox !== null && prev.avgBuyBox !== null ? calcDelta(cur.avgBuyBox, prev.avgBuyBox) : null,
    };
  }

  return {
    totalRevenue: cur.totalRevenue,
    totalAdSpend: cur.totalAdSpend,
    roas: cur.roas,
    totalClicks: cur.totalClicks,
    avgCtr: cur.avgCtr,
    avgBuyBox: cur.avgBuyBox,
    dailyTrend,
    roasByChannel,
    deltas,
  };
}
