import { getTable } from "@/lib/local-store";
import { getLatestReportDate } from "@/lib/queries/inventory";
import { calcDelta } from "@/lib/date-utils";

export interface ProductRow {
  asin: string;
  item_name: string;
  price: number;
  afn_fulfillable: number;
  afn_total: number;
  sessions_total: number;
  page_views_total: number;
  buy_box_percentage: number;
  unit_session_percentage: number;
  units_ordered: number;
  revenue: number;
  risk_days: number | null;
}

export interface ProductDetail {
  asin: string;
  item_name: string;
  dailyRevenue: { date: string; revenue: number }[];
  dailyTraffic: { date: string; sessions: number; conversion: number }[];
  campaigns: { type: string; campaign_name: string; cost: number; sales_14d: number; roas: number | null }[];
  inventoryTrend: { report_date: string; afn_fulfillable: number }[];
  countryBreakdown: { ship_country: string; revenue: number; orders: number }[];
}

interface ListingStored { asin: string; item_name: string; price: number; status: string }
interface InventoryStored { report_date: string; asin: string; afn_fulfillable: number; afn_total: number }
interface TrafficStored {
  report_date: string; child_asin: string;
  sessions_total: number; page_views_total: number;
  buy_box_percentage: number; unit_session_percentage: number;
}
interface OrderStored { purchase_date: string; asin: string; quantity: number; item_price: number; ship_country: string }
interface AdCampaign {
  date: string; type: string; campaign_name: string; cost: number; sales_14d: number;
}

function inRange(d: string, from: string, to: string) { return d >= from && d <= to; }

export async function getProducts(dateFrom: string, dateTo: string, asin?: string): Promise<ProductRow[]> {
  const [reportDate, allListings, allInventory, allTraffic, allOrders] = await Promise.all([
    getLatestReportDate(),
    getTable<ListingStored>("listing"),
    getTable<InventoryStored>("inventory"),
    getTable<TrafficStored>("traffic"),
    getTable<OrderStored>("orders"),
  ]);

  const listings = allListings.filter((l) => l.status === "Active");
  const filtered = asin ? listings.filter((l) => l.asin === asin) : listings;

  const invRows = reportDate
    ? allInventory.filter((r) => r.report_date === reportDate)
    : [];
  const invByAsin = new Map(invRows.map((r) => [r.asin, r]));

  const traffic = allTraffic.filter((r) => inRange(r.report_date, dateFrom, dateTo));
  const trafficByAsin = new Map<string, { sessions: number; pageViews: number; bb: number; usp: number; count: number }>();
  for (const r of traffic) {
    let cur = trafficByAsin.get(r.child_asin);
    if (!cur) { cur = { sessions: 0, pageViews: 0, bb: 0, usp: 0, count: 0 }; trafficByAsin.set(r.child_asin, cur); }
    cur.sessions += r.sessions_total ?? 0;
    cur.pageViews += r.page_views_total ?? 0;
    cur.bb += r.buy_box_percentage ?? 0;
    cur.usp += r.unit_session_percentage ?? 0;
    cur.count += 1;
  }

  const orders = allOrders.filter((o) => inRange(o.purchase_date, dateFrom, dateTo));
  const ordersByAsin = new Map<string, { units: number; revenue: number; days: Set<string> }>();
  for (const o of orders) {
    let cur = ordersByAsin.get(o.asin);
    if (!cur) { cur = { units: 0, revenue: 0, days: new Set() }; ordersByAsin.set(o.asin, cur); }
    cur.units += o.quantity ?? 0;
    cur.revenue += (o.item_price ?? 0) * (o.quantity ?? 0);
    cur.days.add(o.purchase_date);
  }

  const result: ProductRow[] = filtered.map((l) => {
    const inv = invByAsin.get(l.asin);
    const tr = trafficByAsin.get(l.asin);
    const ord = ordersByAsin.get(l.asin);
    const dailySales = ord && ord.days.size > 0 ? ord.units / ord.days.size : 0;
    const fulfillable = inv?.afn_fulfillable ?? 0;
    return {
      asin: l.asin,
      item_name: l.item_name ?? "",
      price: l.price ?? 0,
      afn_fulfillable: fulfillable,
      afn_total: inv?.afn_total ?? 0,
      sessions_total: tr && tr.count > 0 ? tr.sessions / tr.count : 0,
      page_views_total: tr && tr.count > 0 ? tr.pageViews / tr.count : 0,
      buy_box_percentage: tr && tr.count > 0 ? tr.bb / tr.count : 0,
      unit_session_percentage: tr && tr.count > 0 ? tr.usp / tr.count : 0,
      units_ordered: ord?.units ?? 0,
      revenue: ord?.revenue ?? 0,
      risk_days: dailySales > 0 ? Math.round(fulfillable / dailySales) : null,
    };
  });

  result.sort((a, b) => b.revenue - a.revenue);
  return result;
}

export interface ProductKpis {
  totalUnits: number;
  totalRevenue: number;
  avgBuyBox: number | null;
  deltas: { totalUnits: number | null; totalRevenue: number | null; avgBuyBox: number | null } | null;
}

function aggregateProductKpis(allOrders: OrderStored[], allTraffic: TrafficStored[], from: string, to: string) {
  const orders = allOrders.filter((o) => inRange(o.purchase_date, from, to));
  const traffic = allTraffic.filter((r) => inRange(r.report_date, from, to));
  const totalUnits = orders.reduce((s, o) => s + (o.quantity ?? 0), 0);
  const totalRevenue = orders.reduce((s, o) => s + (o.item_price ?? 0) * (o.quantity ?? 0), 0);
  const avgBuyBox = traffic.length > 0
    ? traffic.reduce((s, r) => s + (r.buy_box_percentage ?? 0), 0) / traffic.length
    : null;
  return { totalUnits, totalRevenue, avgBuyBox };
}

export async function getProductKpis(
  dateFrom: string,
  dateTo: string,
  prevFrom?: string,
  prevTo?: string,
): Promise<ProductKpis> {
  const [allOrders, allTraffic] = await Promise.all([
    getTable<OrderStored>("orders"),
    getTable<TrafficStored>("traffic"),
  ]);

  const cur = aggregateProductKpis(allOrders, allTraffic, dateFrom, dateTo);

  let deltas: ProductKpis["deltas"] = null;
  if (prevFrom && prevTo) {
    const prev = aggregateProductKpis(allOrders, allTraffic, prevFrom, prevTo);
    deltas = {
      totalUnits: calcDelta(cur.totalUnits, prev.totalUnits),
      totalRevenue: calcDelta(cur.totalRevenue, prev.totalRevenue),
      avgBuyBox: cur.avgBuyBox !== null && prev.avgBuyBox !== null
        ? calcDelta(cur.avgBuyBox, prev.avgBuyBox)
        : null,
    };
  }

  return { ...cur, deltas };
}

export async function getProductDetail(asin: string, dateFrom: string, dateTo: string): Promise<ProductDetail> {
  const [allListings, allOrders, allTraffic, allAds, allInventory] = await Promise.all([
    getTable<ListingStored>("listing"),
    getTable<OrderStored>("orders"),
    getTable<TrafficStored>("traffic"),
    getTable<AdCampaign>("ad_campaigns"),
    getTable<InventoryStored>("inventory"),
  ]);

  const listing = allListings.find((l) => l.asin === asin);

  const orders = allOrders.filter(
    (o) => o.asin === asin && inRange(o.purchase_date, dateFrom, dateTo),
  );
  const revByDate = new Map<string, number>();
  for (const o of orders) {
    revByDate.set(o.purchase_date, (revByDate.get(o.purchase_date) ?? 0) + (o.item_price ?? 0) * (o.quantity ?? 0));
  }
  const dailyRevenue = Array.from(revByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const traffic = allTraffic.filter(
    (r) => r.child_asin === asin && inRange(r.report_date, dateFrom, dateTo),
  );
  const dailyTraffic = traffic
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map((r) => ({ date: r.report_date, sessions: r.sessions_total ?? 0, conversion: r.unit_session_percentage ?? 0 }));

  const ads = allAds.filter((r) => inRange(r.date, dateFrom, dateTo));
  const campMap = new Map<string, { type: string; campaign_name: string; cost: number; sales_14d: number }>();
  for (const r of ads) {
    const key = `${r.campaign_name}|${r.type}`;
    let cur = campMap.get(key);
    if (!cur) { cur = { type: r.type, campaign_name: r.campaign_name ?? "", cost: 0, sales_14d: 0 }; campMap.set(key, cur); }
    cur.cost += r.cost ?? 0;
    cur.sales_14d += r.sales_14d ?? 0;
  }
  const campaigns = Array.from(campMap.values())
    .map((c) => ({ ...c, roas: c.cost > 0 ? Math.round((c.sales_14d / c.cost) * 100) / 100 : null }))
    .sort((a, b) => b.sales_14d - a.sales_14d)
    .slice(0, 20);

  const inventoryTrend = allInventory
    .filter((r) => r.asin === asin && inRange(r.report_date, dateFrom, dateTo))
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map((r) => ({ report_date: r.report_date, afn_fulfillable: r.afn_fulfillable ?? 0 }));

  const countryMap = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    let cur = countryMap.get(o.ship_country);
    if (!cur) { cur = { revenue: 0, orders: 0 }; countryMap.set(o.ship_country, cur); }
    cur.revenue += (o.item_price ?? 0) * (o.quantity ?? 0);
    cur.orders += 1;
  }
  const countryBreakdown = Array.from(countryMap.entries())
    .map(([ship_country, v]) => ({ ship_country, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    asin,
    item_name: listing?.item_name ?? "",
    dailyRevenue,
    dailyTraffic,
    campaigns,
    inventoryTrend,
    countryBreakdown,
  };
}
