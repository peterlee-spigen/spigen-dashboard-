"use client";
import { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { useFilterStore } from "@/store/filter-store";
import { getOrderStats, type DailyOrderRow, type CountryRow, type AsinRow, type OrderDeltas } from "@/lib/queries/orders";
import KpiCard from "@/components/cards/KpiCard";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

function eur(n: number) {
  return `€${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
}

interface Stats {
  daily: DailyOrderRow[];
  byCountry: CountryRow[];
  topAsins: AsinRow[];
  deltas: OrderDeltas | null;
}

export default function OrdersPage() {
  const { dateFrom, dateTo, prevDateFrom, prevDateTo } = useFilterStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOrderStats(dateFrom, dateTo, prevDateFrom, prevDateTo)
      .then((d) => { if (!cancelled) { setStats(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setStats(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  if (loading) return <div className="p-8 text-neutral-400">로딩 중...</div>;
  if (!stats || stats.daily.length === 0) return (
    <div className="p-8 space-y-2">
      <p className="text-neutral-500 font-medium">주문 데이터가 없습니다.</p>
      <p className="text-sm text-neutral-400">
        <a href="/upload" className="underline text-blue-500">데이터 업로드</a> 페이지에서 주문 CSV를 업로드해 주세요.
      </p>
    </div>
  );

  const totalOrders = stats.daily.reduce((s, d) => s + d.orders, 0);
  const totalUnits = stats.daily.reduce((s, d) => s + d.units, 0);
  const totalRevenue = stats.daily.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">주문 분석</h1>

      {/* KPI 요약 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="총 주문 건수" value={totalOrders.toLocaleString("de-DE")} unit="건" delta={stats.deltas?.orders} />
        <KpiCard label="총 판매 수량" value={totalUnits.toLocaleString("de-DE")} unit="개" delta={stats.deltas?.units} />
        <KpiCard label="총 매출" value={eur(totalRevenue)} delta={stats.deltas?.revenue} />
      </div>

      {/* 일별 주문 추세 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">일별 주문 추세</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={stats.daily}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, name) =>
                name === "매출" ? eur(v as number) : (v as number).toLocaleString("de-DE")
              }
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="units" name="판매 수량" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출" stroke="#10b981" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* 국가별 매출 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">국가별 매출</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.byCountry} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v as number).toLocaleString("de-DE", { maximumFractionDigits: 0 })}`} />
              <YAxis type="category" dataKey="country" tick={{ fontSize: 12 }} width={40} />
              <Tooltip formatter={(v) => eur(v as number)} />
              <Bar dataKey="revenue" name="매출" radius={[0, 4, 4, 0]}>
                {stats.byCountry.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 상품별 Top 10 */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">ASIN별 매출 Top 10</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.topAsins} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="asin" tick={{ fontSize: 9, angle: -35, textAnchor: "end" }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${(v as number).toLocaleString("de-DE", { maximumFractionDigits: 0 })}`} />
              <Tooltip formatter={(v, name) => name === "매출" ? eur(v as number) : (v as number).toLocaleString("de-DE")} />
              <Legend />
              <Bar dataKey="revenue" name="매출" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="units" name="판매 수량" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
