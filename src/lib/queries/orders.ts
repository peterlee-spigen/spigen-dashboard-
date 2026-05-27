import { getTable } from "@/lib/local-store";
import { calcDelta } from "@/lib/date-utils";

interface OrderRow {
  purchase_date: string;
  asin: string;
  sku: string;
  quantity: number;
  item_price: number;
  ship_country: string;
  fulfillment_channel: string;
  order_status: string;
}

function inRange(d: string, from: string, to: string) {
  return d >= from && d <= to;
}

export interface DailyOrderRow { date: string; orders: number; units: number; revenue: number }
export interface CountryRow { country: string; orders: number; units: number; revenue: number }
export interface AsinRow { asin: string; units: number; revenue: number }
export interface OrderDeltas { orders: number | null; units: number | null; revenue: number | null }

function aggregateOrders(all: OrderRow[], from: string, to: string) {
  const rows = all.filter((o) => inRange(o.purchase_date, from, to) && o.order_status !== "Cancelled");
  const totalOrders = rows.length;
  const totalUnits = rows.reduce((s, o) => s + (o.quantity ?? 0), 0);
  const totalRevenue = rows.reduce((s, o) => s + (o.item_price ?? 0) * (o.quantity ?? 0), 0);
  return { rows, totalOrders, totalUnits, totalRevenue };
}

export async function getOrderStats(
  dateFrom: string,
  dateTo: string,
  prevFrom?: string,
  prevTo?: string,
) {
  const all = await getTable<OrderRow>("orders");
  const cur = aggregateOrders(all, dateFrom, dateTo);

  // 일별 추세
  const dailyMap = new Map<string, DailyOrderRow>();
  for (const o of cur.rows) {
    const d = o.purchase_date;
    const entry = dailyMap.get(d) ?? { date: d, orders: 0, units: 0, revenue: 0 };
    entry.orders += 1;
    entry.units += o.quantity ?? 0;
    entry.revenue += (o.item_price ?? 0) * (o.quantity ?? 0);
    dailyMap.set(d, entry);
  }
  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 국가별 집계
  const countryMap = new Map<string, CountryRow>();
  for (const o of cur.rows) {
    const c = o.ship_country || "Unknown";
    const entry = countryMap.get(c) ?? { country: c, orders: 0, units: 0, revenue: 0 };
    entry.orders += 1;
    entry.units += o.quantity ?? 0;
    entry.revenue += (o.item_price ?? 0) * (o.quantity ?? 0);
    countryMap.set(c, entry);
  }
  const byCountry = Array.from(countryMap.values()).sort((a, b) => b.revenue - a.revenue);

  // 상품별 Top 10
  const asinMap = new Map<string, AsinRow>();
  for (const o of cur.rows) {
    const a = o.asin || o.sku || "Unknown";
    const entry = asinMap.get(a) ?? { asin: a, units: 0, revenue: 0 };
    entry.units += o.quantity ?? 0;
    entry.revenue += (o.item_price ?? 0) * (o.quantity ?? 0);
    asinMap.set(a, entry);
  }
  const topAsins = Array.from(asinMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  let deltas: OrderDeltas | null = null;
  if (prevFrom && prevTo) {
    const prev = aggregateOrders(all, prevFrom, prevTo);
    deltas = {
      orders: calcDelta(cur.totalOrders, prev.totalOrders),
      units: calcDelta(cur.totalUnits, prev.totalUnits),
      revenue: calcDelta(cur.totalRevenue, prev.totalRevenue),
    };
  }

  return { daily, byCountry, topAsins, deltas };
}
