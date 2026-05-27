"use client";
import { useEffect, useState } from "react";
import DataTable, { Column } from "@/components/tables/DataTable";
import { useFilterStore } from "@/store/filter-store";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getProducts, getProductDetail, getProductKpis, type ProductRow, type ProductDetail, type ProductKpis } from "@/lib/queries/products";
import KpiCard from "@/components/cards/KpiCard";

function eur(n: number) { return `€${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`; }

function RiskBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-neutral-400">—</span>;
  if (days === 0) return <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded text-xs font-medium">품절</span>;
  if (days < 14) return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 px-2 py-0.5 rounded text-xs font-medium">{days}일</span>;
  return <span className="text-green-600 text-xs">{days}일</span>;
}

export default function ProductsPage() {
  const { dateFrom, dateTo, prevDateFrom, prevDateTo, asinQuery } = useFilterStore();
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [kpis, setKpis] = useState<ProductKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProducts(dateFrom, dateTo, asinQuery || undefined),
      getProductKpis(dateFrom, dateTo, prevDateFrom, prevDateTo),
    ])
      .then(([d, k]) => { if (!cancelled) { setRows(d); setKpis(k); setLoading(false); } })
      .catch(() => { if (!cancelled) { setRows([]); setKpis(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, prevDateFrom, prevDateTo, asinQuery]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    let cancelled = false;
    getProductDetail(selected, dateFrom, dateTo)
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => { if (!cancelled) setDetail(null); });
    return () => { cancelled = true; };
  }, [selected, dateFrom, dateTo]);

  const columns: Column<ProductRow>[] = [
    { key: "asin", header: "ASIN", render: r => <span className="font-mono text-xs">{r.asin}</span> },
    { key: "item_name", header: "상품명", render: r => <span className="max-w-xs truncate block" title={r.item_name}>{r.item_name}</span>, sortable: false },
    { key: "price", header: "가격", align: "right", render: r => eur(r.price) },
    { key: "afn_fulfillable", header: "가용재고", align: "right" },
    { key: "risk_days", header: "재고위험", align: "center", render: r => <RiskBadge days={r.risk_days} /> },
    { key: "sessions_total", header: "세션", align: "right" },
    { key: "buy_box_percentage", header: "Buy Box", align: "right", render: r => `${r.buy_box_percentage.toFixed(1)}%` },
    { key: "unit_session_percentage", header: "전환율", align: "right", render: r => `${r.unit_session_percentage.toFixed(2)}%` },
    { key: "units_ordered", header: "주문수", align: "right" },
    { key: "revenue", header: "매출", align: "right", render: r => eur(r.revenue) },
  ];

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">상품 성과 분석</h1>

      {/* KPI 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          label="총 판매 수량"
          value={kpis ? kpis.totalUnits.toLocaleString("de-DE") : null}
          unit="개"
          delta={kpis?.deltas?.totalUnits}
        />
        <KpiCard
          label="총 매출"
          value={kpis ? `€${kpis.totalRevenue.toLocaleString("de-DE", { maximumFractionDigits: 2 })}` : null}
          delta={kpis?.deltas?.totalRevenue}
          highlight
        />
        <KpiCard
          label="평균 Buy Box"
          value={kpis?.avgBuyBox !== null && kpis?.avgBuyBox !== undefined ? kpis.avgBuyBox.toFixed(1) : null}
          unit="%"
          delta={kpis?.deltas?.avgBuyBox}
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-neutral-400">로딩 중...</div> : (
          <DataTable
            columns={columns as unknown as Column<Record<string, unknown>>[]}
            data={rows as unknown as Record<string, unknown>[]}
            onRowClick={(r) => setSelected(selected === (r as unknown as ProductRow).asin ? null : (r as unknown as ProductRow).asin)}
          />
        )}
      </div>

      {/* 드릴다운 슬라이드오버 */}
      {selected && detail && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-mono text-sm text-neutral-500">{detail.asin}</p>
              <p className="font-semibold text-neutral-900 dark:text-neutral-50">{detail.item_name}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-600 text-xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">일별 매출 추세</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={detail.dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => typeof v === "number" ? eur(v) : v} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 mb-2">일별 세션 추세</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={detail.dailyTraffic}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sessions" stroke="#10b981" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
