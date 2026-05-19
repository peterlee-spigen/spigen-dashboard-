import { getTable } from "@/lib/local-store";

export interface TrafficTrendRow {
  date: string;
  sessions: number;
  page_views: number;
}

export interface TrafficAsinRow {
  child_asin: string;
  title: string;
  sessions_total: number;
  page_views_total: number;
  buy_box_percentage: number;
  unit_session_percentage: number;
  units_ordered: number;
  ordered_product_sales: number;
}

interface TrafficStored {
  report_date: string; child_asin: string; title: string;
  sessions_total: number; page_views_total: number; buy_box_percentage: number;
  unit_session_percentage: number; units_ordered: number; ordered_product_sales: number;
}

function inRange(d: string, from: string, to: string) { return d >= from && d <= to; }

export async function getTrafficTrend(dateFrom: string, dateTo: string): Promise<TrafficTrendRow[]> {
  const rows = (await getTable<TrafficStored>("traffic")).filter((r) => inRange(r.report_date, dateFrom, dateTo));
  const grouped = new Map<string, { sessions: number; page_views: number }>();
  for (const r of rows) {
    const cur = grouped.get(r.report_date) ?? { sessions: 0, page_views: 0 };
    cur.sessions += r.sessions_total ?? 0;
    cur.page_views += r.page_views_total ?? 0;
    grouped.set(r.report_date, cur);
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, sessions: v.sessions, page_views: v.page_views }));
}

function aggregateByAsin(rows: TrafficStored[]): TrafficAsinRow[] {
  const grouped = new Map<string, {
    title: string;
    sessions: number; pageViews: number; buyBox: number; usp: number; count: number;
    units: number; sales: number;
  }>();
  for (const r of rows) {
    let cur = grouped.get(r.child_asin);
    if (!cur) {
      cur = {
        title: r.title ?? "",
        sessions: 0, pageViews: 0, buyBox: 0, usp: 0, count: 0,
        units: 0, sales: 0,
      };
      grouped.set(r.child_asin, cur);
    }
    if (r.title && r.title.length > cur.title.length) cur.title = r.title;
    cur.sessions += r.sessions_total ?? 0;
    cur.pageViews += r.page_views_total ?? 0;
    cur.buyBox += r.buy_box_percentage ?? 0;
    cur.usp += r.unit_session_percentage ?? 0;
    cur.count += 1;
    cur.units += r.units_ordered ?? 0;
    cur.sales += r.ordered_product_sales ?? 0;
  }
  const result: TrafficAsinRow[] = Array.from(grouped.entries()).map(([asin, v]) => ({
    child_asin: asin,
    title: v.title,
    sessions_total: v.count > 0 ? v.sessions / v.count : 0,
    page_views_total: v.count > 0 ? v.pageViews / v.count : 0,
    buy_box_percentage: v.count > 0 ? v.buyBox / v.count : 0,
    unit_session_percentage: v.count > 0 ? v.usp / v.count : 0,
    units_ordered: v.units,
    ordered_product_sales: v.sales,
  }));
  return result;
}

export async function getTrafficByAsin(dateFrom: string, dateTo: string, asin?: string): Promise<TrafficAsinRow[]> {
  let rows = (await getTable<TrafficStored>("traffic")).filter((r) => inRange(r.report_date, dateFrom, dateTo));
  if (asin) rows = rows.filter((r) => r.child_asin === asin);
  const result = aggregateByAsin(rows);
  result.sort((a, b) => b.sessions_total - a.sessions_total);
  return result;
}

export async function getLowBuyBoxAsins(dateFrom: string, dateTo: string, threshold = 80): Promise<TrafficAsinRow[]> {
  const rows = (await getTable<TrafficStored>("traffic")).filter((r) => inRange(r.report_date, dateFrom, dateTo));
  const result = aggregateByAsin(rows).filter((r) => r.buy_box_percentage < threshold);
  result.sort((a, b) => a.buy_box_percentage - b.buy_box_percentage);
  return result;
}
