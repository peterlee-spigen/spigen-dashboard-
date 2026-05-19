import { normalizeDate, parseFloat_, parseInt_ } from "./normalize-date";

export interface AttributionRow {
  date: string;
  campaign_id: string;
  ad_group_id: string;
  publisher: string;
  product_asin: string;
  product_name: string;
  attributed_sales_14d: number;
  attributed_purchases_14d: number;
  brand_halo_sales_14d: number;
  brand_halo_purchases_14d: number;
  new_to_brand_sales_14d: number;
  new_to_brand_purchases_14d: number;
  detail_page_views_14d: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAttributionRow(raw: Record<string, any>): AttributionRow | null {
  // date 컬럼값이 "20260301" 형태
  const date = normalizeDate(raw.date);
  if (!date || !raw.productAsin) return null;

  return {
    date,
    campaign_id: raw.campaignId ? String(raw.campaignId) : "",
    ad_group_id: raw.adGroupId ? String(raw.adGroupId) : "",
    publisher: raw.publisher ?? "",
    product_asin: String(raw.productAsin),
    product_name: raw.productName ?? "",
    attributed_sales_14d: parseFloat_(raw.attributedSales14d),
    attributed_purchases_14d: parseInt_(raw.attributedPurchases14d),
    brand_halo_sales_14d: parseFloat_(raw.brandHaloAttributedSales14d),
    brand_halo_purchases_14d: parseInt_(raw.brandHaloAttributedPurchases14d),
    new_to_brand_sales_14d: parseFloat_(raw.attributedNewToBrandSales14d),
    new_to_brand_purchases_14d: parseInt_(raw.attributedNewToBrandPurchases14d),
    detail_page_views_14d: parseInt_(raw.attributedDetailPageViewsClicks14d),
  };
}
