"use client";
import { useEffect, useState } from "react";
import DataTable, { Column } from "@/components/tables/DataTable";
import { useFilterStore } from "@/store/filter-store";
import { getChannelComparison, getCampaigns, getAttributionByAsin } from "@/lib/queries/ads";

type View = "channels" | "campaigns" | "attribution";

interface ChannelRow { type: string; cost_type: string; impressions: number; clicks: number; ctr: number | null; cost: number; sales_14d: number; roas: number | null; cpc: number | null; new_to_brand_sales: number; }
interface CampaignRow { campaign_id: string; campaign_name: string; type: string; status: string; budget_amount: number; cost: number; sales_14d: number; roas: number | null; clicks: number; top_of_search_impression_share: number | null; }
interface AttributionRow { product_asin: string; product_name: string; publisher: string; attributed_sales_14d: number; attributed_purchases_14d: number; brand_halo_sales_14d: number; new_to_brand_sales_14d: number; }

function eur(n: number | null) { return n === null ? "—" : `€${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`; }
function pct(n: number | null) { return n === null ? "—" : `${n.toFixed(2)}%`; }
function num(n: number | null) { return n === null ? "—" : n.toLocaleString("de-DE"); }

export default function AdsPage() {
  const { dateFrom, dateTo, adTypes, campaignStatus } = useFilterStore();
  const [view, setView] = useState<View>("channels");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query =
      view === "campaigns" ? getCampaigns(dateFrom, dateTo, adTypes, campaignStatus)
      : view === "attribution" ? getAttributionByAsin(dateFrom, dateTo)
      : getChannelComparison(dateFrom, dateTo, adTypes);
    query
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, adTypes, campaignStatus, view]);

  const channelCols: Column<ChannelRow>[] = [
    { key: "type", header: "채널" },
    { key: "cost_type", header: "과금 유형" },
    { key: "impressions", header: "노출", align: "right", render: r => num(r.impressions) },
    { key: "clicks", header: "클릭", align: "right", render: r => num(r.clicks) },
    { key: "ctr", header: "CTR", align: "right", render: r => pct(r.ctr) },
    { key: "cost", header: "광고비", align: "right", render: r => eur(r.cost) },
    { key: "sales_14d", header: "귀속매출(14d)", align: "right", render: r => eur(r.sales_14d) },
    { key: "roas", header: "ROAS", align: "right", render: r => r.roas !== null ? r.roas.toFixed(2) : "—" },
    { key: "cpc", header: "CPC", align: "right", render: r => eur(r.cpc) },
    { key: "new_to_brand_sales", header: "NTB 매출", align: "right", render: r => eur(r.new_to_brand_sales) },
  ];

  const campaignCols: Column<CampaignRow>[] = [
    { key: "campaign_name", header: "캠페인명", render: r => <span className="max-w-xs truncate block" title={r.campaign_name}>{r.campaign_name}</span> },
    { key: "type", header: "유형" },
    { key: "status", header: "상태", render: r => <span className={r.status === "ENABLED" ? "text-green-600 font-medium" : "text-neutral-400"}>{r.status}</span> },
    { key: "budget_amount", header: "예산", align: "right", render: r => eur(r.budget_amount) },
    { key: "cost", header: "광고비", align: "right", render: r => eur(r.cost) },
    { key: "sales_14d", header: "귀속매출", align: "right", render: r => eur(r.sales_14d) },
    { key: "roas", header: "ROAS", align: "right", render: r => r.roas !== null ? r.roas.toFixed(2) : "—" },
    { key: "clicks", header: "클릭", align: "right", render: r => num(r.clicks) },
    { key: "top_of_search_impression_share", header: "ToS 점유율", align: "right", render: r => pct(r.top_of_search_impression_share) },
  ];

  const attributionCols: Column<AttributionRow>[] = [
    { key: "product_asin", header: "ASIN" },
    { key: "product_name", header: "상품명", render: r => <span className="max-w-xs truncate block" title={r.product_name}>{r.product_name}</span> },
    { key: "publisher", header: "채널" },
    { key: "attributed_sales_14d", header: "귀속매출(14d)", align: "right", render: r => eur(r.attributed_sales_14d) },
    { key: "attributed_purchases_14d", header: "구매건수", align: "right" },
    {
      key: "brand_halo_sales_14d", header: "Brand Halo 매출", align: "right",
      render: r => <span title="광고된 ASIN이 아닌 동일 브랜드 다른 ASIN에 귀속된 매출">{eur(r.brand_halo_sales_14d)}</span>
    },
    { key: "new_to_brand_sales_14d", header: "NTB 매출", align: "right", render: r => eur(r.new_to_brand_sales_14d) },
  ];

  const tabs: { id: View; label: string }[] = [
    { id: "channels", label: "채널 비교" },
    { id: "campaigns", label: "캠페인 드릴다운" },
    { id: "attribution", label: "Attribution (외부채널)" },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">광고 성과 분석</h1>
      {view === "attribution" && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
          ⚠️ Attribution은 14d 고정 귀속이며 SP 14d 귀속 매출과 이중 계산될 수 있어 합산하지 않습니다.
        </p>
      )}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              view === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-neutral-400">로딩 중...</div>
        ) : view === "channels" ? (
          <DataTable columns={channelCols as unknown as Column<Record<string, unknown>>[]} data={data} />
        ) : view === "campaigns" ? (
          <DataTable columns={campaignCols as unknown as Column<Record<string, unknown>>[]} data={data} />
        ) : (
          <DataTable columns={attributionCols as unknown as Column<Record<string, unknown>>[]} data={data} />
        )}
      </div>
    </div>
  );
}
