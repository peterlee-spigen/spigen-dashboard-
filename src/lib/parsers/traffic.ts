import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface TrafficRow {
  report_date: string;
  parent_asin: string;
  child_asin: string;
  title: string;
  sessions_total: number;
  page_views_total: number;
  buy_box_percentage: number;
  units_ordered: number;
  unit_session_percentage: number;
  ordered_product_sales: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTrafficRow(raw: Record<string, any>): TrafficRow | null {
  const report_date = normalizeDate(raw.report_date);
  const child_asin = raw["(Child) ASIN"] ?? "";
  if (!report_date || !child_asin) return null;

  return {
    report_date,
    parent_asin: raw["(Parent) ASIN"] ?? "",
    child_asin,
    title: raw.Title ?? "",
    sessions_total: parseInt_(raw["Sessions - Total"]),
    page_views_total: parseInt_(raw["Page Views - Total"]),
    // % 기호 포함 문자열 처리
    buy_box_percentage: parseFloat_(raw["Featured Offer (Buy Box) Percentage"]),
    units_ordered: parseInt_(raw["Units ordered"]),
    unit_session_percentage: parseFloat_(raw["Unit session percentage"]),
    ordered_product_sales: parseFloat_(raw["Ordered product sales"]),
  };
}
