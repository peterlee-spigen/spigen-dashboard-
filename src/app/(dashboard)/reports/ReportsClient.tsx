"use client";
import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CountryReport, CategoryReport } from "@/lib/parsers/report-by-country";
import SyncButton from "@/components/SyncButton";

const REPORT_TABS = [
  { id: "national", label: "국가별" },
  { id: "mpc",      label: "MPC" },
  { id: "cp",       label: "CP" },
  { id: "sda",      label: "SDA" },
  { id: "auto",     label: "Auto" },
  { id: "power",    label: "Power" },
] as const;
type ReportTabId = (typeof REPORT_TABS)[number]["id"];

type AllData = {
  national: CountryReport[]
  mpc: CategoryReport[]
  cp: CategoryReport[]
  sda: CategoryReport[]
  auto: CategoryReport[]
  power: CategoryReport[]
}

const CURRENCY: Record<string, string> = {
  UK: "£", DE: "€", FR: "€", IT: "€", ES: "€",
};

// "25-01" → "2025년 1월"
function fmtMonth(m: string): string {
  const [yy, mm] = m.split("-");
  return `20${yy}년 ${parseInt(mm, 10)}월`;
}

function parseNum(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}
function fmt(n: number | null, curr = "") {
  if (n === null) return "—";
  return `${curr}${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}
function calcDelta(curr: number | null, prev: number | null) {
  if (curr === null || prev === null || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
function DeltaBadge({ d }: { d: number | null }) {
  if (d === null) return <span className="text-xs text-neutral-400">전월 대비</span>;
  return (
    <span className={`text-xs font-medium ${d >= 0 ? "text-green-600" : "text-red-500"}`}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(1)}%
    </span>
  );
}

export default function ReportsClient({
  allData,
  fetchedAt,
  lastSync,
}: {
  allData: AllData
  fetchedAt: string
  lastSync: { synced_at: string; status: string } | null
}) {
  const [reportTab, setReportTab] = useState<ReportTabId>("national");
  const [selectedKey, setSelectedKey] = useState<string>("UK");

  // 전체 월 목록 (오름차순)
  const allMonths = useMemo(() => {
    const base = (allData.national[0] ?? allData.mpc[0]) as CountryReport | CategoryReport | undefined;
    return base ? [...base.months].sort() : [];
  }, [allData]);

  const [startMonth, setStartMonth] = useState<string>(() => {
    const base = (allData.national[0] ?? allData.mpc[0]) as CountryReport | CategoryReport | undefined;
    const months = base ? [...base.months].sort() : [];
    return months[Math.max(0, months.length - 12)] ?? "";
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    const base = (allData.national[0] ?? allData.mpc[0]) as CountryReport | CategoryReport | undefined;
    const months = base ? [...base.months].sort() : [];
    return months[months.length - 1] ?? "";
  });

  const data = allData[reportTab] as (CountryReport | CategoryReport)[];
  const keys = data.map((d) => ("country" in d ? d.country : (d as CategoryReport).category));

  const report = data.find((d) =>
    ("country" in d ? d.country : (d as CategoryReport).category) === selectedKey
  ) as CountryReport | undefined;

  const curr = reportTab === "national" ? (CURRENCY[selectedKey] ?? "€") : "€";

  // 선택된 범위의 월 목록
  const visibleMonths = useMemo(
    () => (report ? report.months.filter((m) => m >= startMonth && m <= endMonth) : []),
    [report, startMonth, endMonth]
  );

  const chartData = visibleMonths.map((month) => {
    const idx = report!.months.indexOf(month);
    return {
      month: fmtMonth(month),
      sales: report!.campaign.sales[idx],
      spend: report!.campaign.spend[idx],
      acos: parseNum(report!.campaign.acos[idx]),
      ctr: parseNum(report!.campaign.ctr[idx]),
    };
  });

  const latest = report ? {
    sales:  report.campaign.sales[0],
    spend:  report.campaign.spend[0],
    acos:   report.campaign.acos[0],
    ctr:    report.campaign.ctr[0],
  } : null;

  const prev = report ? {
    sales: report.campaign.sales[1],
    spend: report.campaign.spend[1],
  } : null;

  const loadedTime = new Date(fetchedAt).toISOString().slice(11, 19);

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">광고 리포트</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-400">{loadedTime} 기준</span>
          <SyncButton lastSync={lastSync} />
        </div>
      </div>

      {/* 리포트 유형 탭 */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {REPORT_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setReportTab(id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              reportTab === id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 국가 / 카테고리 선택 + 월 범위 */}
      {keys.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex flex-wrap gap-2">
            {keys.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedKey === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-blue-400"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={startMonth}
              onChange={(e) => {
                setStartMonth(e.target.value);
                if (e.target.value > endMonth) setEndMonth(e.target.value);
              }}
              className="border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
            >
              {allMonths.map((m) => (
                <option key={m} value={m}>{fmtMonth(m)}</option>
              ))}
            </select>
            <span className="text-neutral-400 text-xs">~</span>
            <select
              value={endMonth}
              onChange={(e) => {
                setEndMonth(e.target.value);
                if (e.target.value < startMonth) setStartMonth(e.target.value);
              }}
              className="border border-neutral-300 dark:border-neutral-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
            >
              {allMonths.map((m) => (
                <option key={m} value={m}>{fmtMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!report ? (
        <div className="p-8 text-neutral-400 text-sm">데이터 없음</div>
      ) : (
        <>
          {/* KPI 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "광고 매출",    value: fmt(latest?.sales ?? null, curr), d: calcDelta(latest?.sales ?? null, prev?.sales ?? null) },
              { label: "광고비 Spend", value: fmt(latest?.spend ?? null, curr), d: calcDelta(latest?.spend ?? null, prev?.spend ?? null) },
              { label: "ACOS",        value: latest?.acos ?? "—",              d: null },
              { label: "CTR",         value: latest?.ctr  ?? "—",              d: null },
            ].map(({ label, value, d }) => (
              <div key={label} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4">
                <p className="text-xs text-neutral-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50 truncate">{value}</p>
                <DeltaBadge d={d} />
              </div>
            ))}
          </div>

          {/* 매출 vs 광고비 */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">
              월별 광고 매출 vs 광고비 ({curr}, {visibleMonths.length}개월)
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${curr}${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => `${curr}${v.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`} />
                <Legend />
                <Bar dataKey="sales" name="광고 매출" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="spend" name="광고비"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ACOS & CTR */}
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
                <Line type="monotone" dataKey="ctr"  name="CTR"  stroke="#10b981" dot={false} strokeWidth={2} />
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
                  {visibleMonths.map((month) => {
                    const i = report.months.indexOf(month);
                    return (
                      <tr key={month} className={i === 0 ? "bg-blue-50/50 dark:bg-blue-950/20 font-medium" : ""}>
                        <td className="px-4 py-2 text-neutral-700 dark:text-neutral-300">{fmtMonth(month)}</td>
                        <td className="px-4 py-2 text-right">{fmt(report.campaign.impressions[i])}</td>
                        <td className="px-4 py-2 text-right">{fmt(report.campaign.clicks[i])}</td>
                        <td className="px-4 py-2 text-right">{report.campaign.ctr[i] ?? "—"}</td>
                        <td className="px-4 py-2 text-right">{fmt(report.campaign.spend[i], curr)}</td>
                        <td className="px-4 py-2 text-right">{report.campaign.acos[i] ?? "—"}</td>
                        <td className="px-4 py-2 text-right">{fmt(report.campaign.orders[i])}</td>
                        <td className="px-4 py-2 text-right">{fmt(report.campaign.sales[i], curr)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
