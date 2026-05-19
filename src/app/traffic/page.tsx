"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DataTable, { Column } from "@/components/tables/DataTable";
import { useFilterStore } from "@/store/filter-store";
import { getTrafficTrend, getLowBuyBoxAsins, type TrafficTrendRow as TrafficTrend, type TrafficAsinRow as TrafficAsin } from "@/lib/queries/traffic";

export default function TrafficPage() {
  const { dateFrom, dateTo } = useFilterStore();
  const [trend, setTrend] = useState<TrafficTrend[]>([]);
  const [lowBuyBox, setLowBuyBox] = useState<TrafficAsin[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getTrafficTrend(dateFrom, dateTo), getLowBuyBoxAsins(dateFrom, dateTo)])
      .then(([trend, low]) => { if (!cancelled) { setTrend(trend); setLowBuyBox(low); setLoading(false); } })
      .catch(() => { if (!cancelled) { setTrend([]); setLowBuyBox([]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  const asinCols: Column<TrafficAsin>[] = [
    { key: "child_asin", header: "ASIN", render: r => <span className="font-mono text-xs">{r.child_asin}</span> },
    { key: "title", header: "상품명", render: r => <span className="max-w-xs truncate block" title={r.title}>{r.title}</span>, sortable: false },
    { key: "sessions_total", header: "세션", align: "right" },
    { key: "page_views_total", header: "페이지뷰", align: "right" },
    {
      key: "buy_box_percentage", header: "Buy Box", align: "right",
      render: r => <span className={r.buy_box_percentage < 50 ? "text-red-600 font-semibold" : r.buy_box_percentage < 80 ? "text-yellow-600" : "text-green-600"}>
        {r.buy_box_percentage.toFixed(1)}%
      </span>
    },
    { key: "unit_session_percentage", header: "전환율", align: "right", render: r => `${r.unit_session_percentage.toFixed(2)}%` },
    { key: "units_ordered", header: "주문수", align: "right" },
    { key: "ordered_product_sales", header: "매출", align: "right", render: r => `€${r.ordered_product_sales.toLocaleString("de-DE", { maximumFractionDigits: 2 })}` },
  ];

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">트래픽 분석</h1>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">일별 세션 / 페이지뷰 추세</h2>
        {loading ? <div className="h-40 flex items-center justify-center text-neutral-400">로딩 중...</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sessions" name="세션" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="page_views" name="페이지뷰" stroke="#8b5cf6" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Buy Box 80% 미만 ASIN</h2>
        </div>
        <DataTable
          columns={asinCols as unknown as Column<Record<string, unknown>>[]}
          data={lowBuyBox as unknown as Record<string, unknown>[]}
        />
      </div>
    </div>
  );
}
