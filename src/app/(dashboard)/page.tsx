"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import KpiCard from "@/components/cards/KpiCard";
import InventoryRiskBanner from "@/components/cards/InventoryRiskBanner";
import { useFilterStore } from "@/store/filter-store";
import { getSummary, type SummaryData } from "@/lib/queries/summary";

function fmt(n: number | null, digits = 0) {
  if (n === null || n === undefined) return null;
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits });
}

export default function SummaryPage() {
  const { dateFrom, dateTo, prevDateFrom, prevDateTo, adTypes } = useFilterStore();
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getSummary(dateFrom, dateTo, prevDateFrom, prevDateTo)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, adTypes]);

  if (loading) return <div className="p-8 text-neutral-400">로딩 중...</div>;
  if (!data || !data.roasByChannel) return (
    <div className="p-8 space-y-2">
      <p className="text-neutral-500 font-medium">아직 데이터가 없습니다.</p>
      <p className="text-sm text-neutral-400"><a href="/upload" className="underline text-blue-500">데이터 업로드</a> 페이지에서 CSV 파일을 먼저 업로드해 주세요.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Executive Summary</h1>

      <InventoryRiskBanner />

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="총 매출" value={fmt(data.totalRevenue, 2)} unit="EUR" highlight delta={data.deltas?.revenue} />
        <KpiCard label="총 광고비" value={fmt(data.totalAdSpend, 2)} unit="EUR" delta={data.deltas?.adSpend} />
        <KpiCard label="통합 ROAS" value={fmt(data.roas, 2)} sub="SP 14d 기준" delta={data.deltas?.roas} />
        <KpiCard label="총 클릭" value={fmt(data.totalClicks)} delta={data.deltas?.clicks} />
        <KpiCard label="평균 CTR" value={data.avgCtr !== null ? fmt(data.avgCtr, 2) : null} unit="%" delta={data.deltas?.ctr} />
        <KpiCard label="평균 Buy Box" value={data.avgBuyBox !== null ? fmt(data.avgBuyBox, 1) : null} unit="%" delta={data.deltas?.buyBox} />
      </div>

      {/* 매출 vs 광고비 추세 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">일별 매출 vs 광고비 (EUR)</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data.dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => typeof v === "number" ? `€${v.toLocaleString("de-DE", { maximumFractionDigits: 2 })}` : v} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="매출" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="adSpend" name="광고비" stroke="#f59e0b" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 채널별 ROAS */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">채널별 ROAS (SP 14d 기준)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.roasByChannel.filter((r) => r.roas !== null)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="roas" name="ROAS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-neutral-400 mt-2">
          ⚠️ SP 14d와 Attribution 14d는 이중 계산 방지를 위해 합산하지 않습니다.
        </p>
      </div>
    </div>
  );
}
