export type FileType = "sp" | "sb" | "sd" | "attribution" | "orders" | "listing" | "inventory" | "traffic";

const SIGNATURES: { type: FileType; columns: string[] }[] = [
  // 고유 컬럼 기준으로 가장 구체적인 것 먼저
  { type: "traffic",     columns: ["(Child) ASIN", "(Parent) ASIN"] },
  { type: "attribution", columns: ["productAsin", "publisher", "brandHaloAttributedPurchases14d"] },
  { type: "orders",      columns: ["amazon-order-id", "purchase-date", "item-price"] },
  { type: "inventory",   columns: ["afn-fulfillable-quantity", "fnsku"] },
  { type: "listing",     columns: ["seller-sku", "asin1", "item-is-marketplace"] },
  { type: "sd",          columns: ["cumulativeReach", "impressionsViews"] },
  { type: "sb",          columns: ["newToBrandSalesClicks", "viewabilityRate", "detailPageViews"] },
  { type: "sp",          columns: ["attributedSalesSameSku1d", "topOfSearchImpressionShare"] },
];

export function detectFileType(headers: string[]): FileType | null {
  const headerSet = new Set(headers);
  for (const { type, columns } of SIGNATURES) {
    if (columns.every((c) => headerSet.has(c))) return type;
  }
  // 헤더 부분 매칭 fallback
  for (const { type, columns } of SIGNATURES) {
    if (columns.some((c) => headerSet.has(c))) return type;
  }
  return null;
}
