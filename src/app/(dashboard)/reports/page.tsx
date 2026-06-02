"use client";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CountryReport } from "@/lib/parsers/report-by-country";

const COUNTRIES = ["UK", "DE", "FR", "IT", "ES"];
const CURRENCY: Record<string, string> = { UK: "£", DE: "€", FR: "€", IT: "€", ES: "€" };

function parseNum(s: string | undefined | null): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}

function fmt(n: number | null, currency = "") {
  if (n === null) return "—";
  return `${currency}${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}

export default function ReportsPage() {
  const [data, setData] = useState<CountryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("UK");

  useEffect(() => {
    fetch("/api/report-by-country")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const report = data.find((d) => d.country === country);
  const curr = CURRENCY[country] ?? "€";

  // Build chart data (most recent 12 months, oldest first)
  const chartData = report
    ? [...report.months]
        .slice(0, 12)
        .reverse()
        .map((month, i) => {
          const idx = report.months.indexOf(month);
          return {
            month,
            sales: report.campaign.sales[idx],
            spend: report.campaign.spend[idx],
            orders: report.campaign.orders[idx],
            acos: parseNum(report.campaign.acos[idx]),
            ctr: parseNum(report.campaign.ctr[idx]),
          };
        })
    : [];

  // Latest month KPIs
  const latest = report
    ? {
        sales: report.campaign.sales[0],
        spend: report.campaign.spend[0],
        orders: report.campaign.orders[0],
        acos: report.campaign.acos[0],
        ctr: report.campaign.ctr[0],
        impressions: report.campaign.impressions[0],
        clicks: report.campaign.clicks[0],
      }
    : null;

  const prev = report
    ? {
        sales: report.campaign.sales[1],
        spend: report.campaign.spend[1],
      }
    : null;

  function delta(curr: number | null, prev: number | null) {
    if (curr === null || prev === null || prev === 0) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  }

  function DeltaBadge({ d }: { d: number | null }) {
    if (d === null) return null;
    const up = d >= 0;
    return (
      <span className={`text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
        {up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
      </span>
    );
  }

  if (loading) return <div className="p-8 text-neutral-400">Google Sheets에서 데이터 불러오는 중...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">국가별 광고 리포트</h1>
        <span className="text-xs text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
          📊 Google Sheets 연동
        </span>
      </div>

      {/* 국가 탭 */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {COUNTRIES.map((c) => (
          <button
            key={c}
            onClick={() => setCountry(c)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              country === c
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {!report ? (
        <div className="p-8 text-neutral-400">데이터 없음</div>
      ) : (
        <>
          {/* 최신월 KPI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "광고 매출", value: fmt(latest?.sales ?? null, curr),
                delta: delta(latest?.sales ?? null, prev?.sales ?? null),
              },
              {
                label: "광고비 Spend", value: fmt(latest?.spend ?? null, curr),
                delta: delta(latest?.spend ?? null, prev?.spend ?? null),
              },
              { label: "ACOS", value: latest?.acos ?? "—", delta: null },
              { label: "CTR", value: latest?.ctr ?? "—", delta: null },
            ].map(({ label, value, delta: d }) => (
              <div
                key={label}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4"
              >
                <p className="text-xs text-neutral-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
                <DeltaBadge d={d} />
                {d === null && <span className="text-xs text-neutral-400">전월 대비</span>}
              </div>
            ))}
          </div>

          {/* 매출 vs 광고비 추세 */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">
              월별 광고 매출 vs 광고비 ({curr})
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${curr}${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => `${curr}${v.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}
                />
                <Legend />
                <Bar dataKey="sales" name="광고 매출" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spend" name="광고비" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ACOS 추세 */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">
              월별 ACOS & CTR (%)
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
                <Line type="monotone" dataKey="acos" name="ACOS" stroke="#ef4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="ctr" name="CTR" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 월별 상세 테이블 */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">월별 상세 지표</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 text-xs">
                  <tr>
                    {["월", "노출", "클릭", "CTR", "광고비", "ACOS", "주문", "매출"].map((h) => (
                      <th key={h} className="px-4 py-2 text-right first:text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {report.months.slice(0, 16).map((month, i) => (
                    <tr key={month} className={i === 0 ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""}>
                      <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{month}</td>
                      <td className="px-4 py-2 text-right">{fmt(report.campaign.impressions[i])}</td>
                      <td className="px-4 py-2 text-right">{fmt(report.campaign.clicks[i])}</td>
                      <td className="px-4 py-2 text-right">{report.campaign.ctr[i] ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{fmt(report.campaign.spend[i], curr)}</td>
                      <td className="px-4 py-2 text-right">{report.campaign.acos[i] ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{fmt(report.campaign.orders[i])}</td>
                      <td className="px-4 py-2 text-right">{fmt(report.campaign.sales[i], curr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
