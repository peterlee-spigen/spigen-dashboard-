"use client";
import { useState, useMemo } from "react";
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { CountryReport, CategoryReport } from "@/lib/parsers/report-by-country";
import SyncButton from "@/components/SyncButton";

/* ── 타입 ─────────────────────────────────────── */
type SheetKey = "national" | "mpc" | "cp" | "sda" | "auto" | "power";
type MetricKey = "sales" | "spend" | "impressions" | "clicks" | "orders" | "acos" | "ctr" | "cvr";

type AllData = {
  national: CountryReport[];
  mpc: CategoryReport[];
  cp: CategoryReport[];
  sda: CategoryReport[];
  auto: CategoryReport[];
  power: CategoryReport[];
};

/* ── 상수 ─────────────────────────────────────── */
const COUNTRIES = ["UK", "DE", "FR", "IT", "ES"] as const;
const SUB_CATEGORIES = ["사업부", "삼성A", "애플"] as const;
type SubCategoryKey = typeof SUB_CATEGORIES[number];
const CATEGORIES: { key: SheetKey; label: string }[] = [
  { key: "mpc", label: "MPC" },
  { key: "cp", label: "CP" },
  { key: "sda", label: "SDA" },
  { key: "auto", label: "Auto" },
  { key: "power", label: "Power" },
];
const SHEETS: { key: SheetKey; label: string }[] = [
  { key: "national", label: "국가별" },
  ...CATEGORIES,
];
const METRICS: { key: MetricKey; label: string; isRatio: boolean }[] = [
  { key: "sales",       label: "광고 매출",  isRatio: false },
  { key: "spend",       label: "광고비",    isRatio: false },
  { key: "impressions", label: "노출",     isRatio: false },
  { key: "clicks",      label: "클릭",     isRatio: false },
  { key: "orders",      label: "주문",     isRatio: false },
  { key: "acos",        label: "ACOS",    isRatio: true  },
  { key: "ctr",         label: "CTR",     isRatio: true  },
  { key: "cvr",         label: "CVR",     isRatio: true  },
];
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

/* ── 유틸 ─────────────────────────────────────── */
function fmtMonth(m: string): string {
  const [yy, mm] = m.split("-");
  return `20${yy}년 ${parseInt(mm, 10)}월`;
}
function parseNum(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  if (typeof s === "number") return s;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
}
function fmtVal(n: number | null, isRatio: boolean, curr = ""): string {
  if (n === null) return "—";
  if (isRatio) return `${n.toFixed(1)}%`;
  return `${curr}${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}

/** CountryReport | CategoryReport에서 MetricKey 값 추출 */
function getMetricValue(
  report: CountryReport | CategoryReport,
  metric: MetricKey,
  idx: number
): number | null {
  if (metric in report.campaign) {
    const v = (report.campaign as Record<string, (number | string | null)[]>)[metric]?.[idx];
    return parseNum(v as string | number | null);
  }
  if (metric === "acos") return parseNum(report.campaign.acos[idx]);
  if (metric === "ctr")  return parseNum(report.campaign.ctr[idx]);
  if (metric === "cvr")  return parseNum(report.campaign.cvr[idx]);
  return null;
}

/* ── 컴포넌트 ────────────────────────────────── */
export default function CompareClient({
  allData,
  lastSync,
}: {
  allData: AllData;
  lastSync: { synced_at: string; status: string } | null;
}) {
  const [viewMode, setViewMode]           = useState<"country" | "category">("country");
  const [selectedSheet, setSelectedSheet] = useState<SheetKey>("national");
  const [selectedCountry, setSelectedCountry] = useState<string>("UK");
  const [selectedMetric, setSelectedMetric]   = useState<MetricKey>("sales");
  const [selectedSubCat, setSelectedSubCat]   = useState<SubCategoryKey>("사업부");

  // 전체 월 목록 (오름차순, YY-MM 형식)
  const allMonths = useMemo(() => {
    const base = allData.national[0] ?? allData.mpc[0];
    return base ? [...base.months].sort() : [];
  }, [allData]);

  const [startMonth, setStartMonth] = useState<string>(() => {
    const base = allData.national[0] ?? allData.mpc[0];
    const months = base ? [...base.months].sort() : [];
    // 기본: 최근 12개월 시작
    return months[Math.max(0, months.length - 12)] ?? months[0] ?? "";
  });
  const [endMonth, setEndMonth] = useState<string>(() => {
    const base = allData.national[0] ?? allData.mpc[0];
    const months = base ? [...base.months].sort() : [];
    return months[months.length - 1] ?? "";
  });

  const metricInfo = METRICS.find((m) => m.key === selectedMetric)!;

  /* ── 시리즈 데이터 구성 ──────────────────── */
  // 현재 시트에서 서브카테고리 목록 추출 (없으면 빈 배열)
  const availableSubCats = useMemo(() => {
    if (selectedSheet === "national") return [];
    const data = allData[selectedSheet] as CategoryReport[];
    return [...new Set(data.map(r => r.subCategory).filter(Boolean))].sort();
  }, [selectedSheet, allData]);

  const series: { key: string; label: string; color: string; report: CountryReport | CategoryReport | undefined }[] =
    useMemo(() => {
      if (viewMode === "country") {
        const sheetData = allData[selectedSheet] as (CountryReport | CategoryReport)[];
        // 서브카테고리 필터 적용
        const filteredData = availableSubCats.length > 0
          ? (sheetData as CategoryReport[]).filter(r => r.subCategory === selectedSubCat)
          : sheetData;
        // 해당 서브카테고리에 데이터가 있는 국가만 시리즈로 구성
        const visibleCountries = availableSubCats.length > 0
          ? COUNTRIES.filter(c => (filteredData as CategoryReport[]).some(r => r.category === c))
          : COUNTRIES;
        return visibleCountries.map((c, i) => ({
          key: c,
          label: c,
          color: COLORS[i % COLORS.length],
          report: filteredData.find((r) =>
            "country" in r ? r.country === c : (r as CategoryReport).category === c
          ),
        }));
      } else {
        // 선택된 국가에서 5개 카테고리 각각의 report 추출
        return CATEGORIES.map(({ key, label }, i) => {
          const data = allData[key] as CategoryReport[];
          const hasSubCats = data.some(r => r.subCategory);
          return {
            key,
            label,
            color: COLORS[i],
            report: data.find((r) =>
              hasSubCats
                ? r.category === selectedCountry && r.subCategory === selectedSubCat
                : r.category === selectedCountry
            ),
          };
        });
      }
    }, [viewMode, selectedSheet, selectedCountry, selectedSubCat, allData, availableSubCats]);

  /* ── 선택 범위 내 월 목록 ─────────────────── */
  const visibleMonths = useMemo(
    () => allMonths.filter((m) => m >= startMonth && m <= endMonth),
    [allMonths, startMonth, endMonth]
  );

  /* ── Multi-series 차트 데이터 ───────────────── */
  const chartData = useMemo(() =>
    visibleMonths.map((month) => {
      const row: Record<string, string | number | null> = { month: fmtMonth(month) };
      series.forEach(({ key, report }) => {
        if (!report) { row[key] = null; return; }
        const idx = report.months.indexOf(month);
        row[key] = idx >= 0 ? getMetricValue(report, selectedMetric, idx) : null;
      });
      return row;
    }),
    [visibleMonths, series, selectedMetric]
  );

  /* ── KPI 요약 (합계 또는 평균) ──────────────── */
  const kpis = useMemo(() =>
    series.map(({ key, label, color, report }) => {
      if (!report) return { key, label, color, value: null };
      const vals = visibleMonths.map((month) => {
        const idx = report.months.indexOf(month);
        return idx >= 0 ? getMetricValue(report, selectedMetric, idx) : null;
      }).filter((v): v is number => v !== null);

      const value = vals.length === 0
        ? null
        : metricInfo.isRatio
          ? vals.reduce((a, b) => a + b, 0) / vals.length   // 평균
          : vals.reduce((a, b) => a + b, 0);                 // 합계
      return { key, label, color, value };
    }),
    [series, visibleMonths, selectedMetric, metricInfo]
  );

  const curr = "€"; // 기본 통화

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">비교 대시보드</h1>
        <SyncButton lastSync={lastSync} />
      </div>

      {/* 컨트롤 영역 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-3">
        {/* 뷰 모드 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 w-16 shrink-0">비교 기준</span>
          {[
            { value: "country",  label: "국가별 비교" },
            { value: "category", label: "카테고리별 비교" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setViewMode(value as "country" | "category")}
              className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                viewMode === value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-blue-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 대상 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 w-16 shrink-0">
            {viewMode === "country" ? "카테고리" : "국가"}
          </span>
          {viewMode === "country"
            ? SHEETS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSelectedSheet(key)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedSheet === key
                      ? "bg-neutral-800 text-white border-neutral-800 dark:bg-white dark:text-neutral-900"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {label}
                </button>
              ))
            : COUNTRIES.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setSelectedCountry(c)}
                  style={selectedCountry === c ? { background: COLORS[i], borderColor: COLORS[i] } : {}}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedCountry === c
                      ? "text-white"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  {c}
                </button>
              ))
          }
        </div>

        {/* 서브카테고리 선택 (서브카테고리가 있는 시트에서만 표시) */}
        {availableSubCats.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-neutral-500 w-16 shrink-0">카테고리</span>
            {availableSubCats.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedSubCat(cat as SubCategoryKey)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  selectedSubCat === cat
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-emerald-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* 지표 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 w-16 shrink-0">지표</span>
          {METRICS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedMetric === key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-blue-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 기간 선택 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-neutral-500 w-16 shrink-0">기간</span>
          <select
            value={startMonth}
            onChange={(e) => {
              setStartMonth(e.target.value);
              if (e.target.value > endMonth) setEndMonth(e.target.value);
            }}
            className="border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </select>
          <span className="text-neutral-400 text-sm">~</span>
          <select
            value={endMonth}
            onChange={(e) => {
              setEndMonth(e.target.value);
              if (e.target.value < startMonth) setStartMonth(e.target.value);
            }}
            className="border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
          >
            {allMonths.map((m) => (
              <option key={m} value={m}>{fmtMonth(m)}</option>
            ))}
          </select>
          <span className="text-xs text-neutral-400">({visibleMonths.length}개월)</span>
        </div>
      </div>

      {/* KPI 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(({ key, label, color, value }) => (
          <div
            key={key}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4"
            style={{ borderLeftColor: color, borderLeftWidth: 4 }}
          >
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50 truncate">
              {fmtVal(value, metricInfo.isRatio, !metricInfo.isRatio ? curr : "")}
            </p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {metricInfo.isRatio ? `${visibleMonths.length}개월 평균` : `${visibleMonths.length}개월 합계`}
            </p>
          </div>
        ))}
      </div>

      {/* Multi-series 라인 차트 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4 text-neutral-700 dark:text-neutral-200">
          {metricInfo.label} 추이 비교 ({visibleMonths.length}개월)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v) =>
                metricInfo.isRatio
                  ? `${v}%`
                  : v >= 1000
                  ? `${curr}${(v / 1000).toFixed(0)}k`
                  : String(v)
              }
            />
            <Tooltip
              formatter={(v: number, name: string) => [
                fmtVal(v, metricInfo.isRatio, !metricInfo.isRatio ? curr : ""),
                name,
              ]}
            />
            <Legend />
            {series.map(({ key, label, color }) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={label}
                stroke={color}
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 비교 테이블 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            월별 비교 상세
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 text-xs">
              <tr>
                <th className="px-4 py-2 text-left whitespace-nowrap sticky left-0 bg-neutral-50 dark:bg-neutral-800">
                  {viewMode === "country" ? "국가" : "카테고리"}
                </th>
                {visibleMonths.map((m) => (
                  <th key={m} className="px-3 py-2 text-right whitespace-nowrap">
                    {fmtMonth(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {series.map(({ key, label, color, report }) => (
                <tr key={key}>
                  <td
                    className="px-4 py-2 font-medium sticky left-0 bg-white dark:bg-neutral-900 whitespace-nowrap"
                    style={{ color }}
                  >
                    {label}
                  </td>
                  {visibleMonths.map((month) => {
                    const idx = report?.months.indexOf(month) ?? -1;
                    const val = report && idx >= 0
                      ? getMetricValue(report, selectedMetric, idx)
                      : null;
                    return (
                      <td key={month} className="px-3 py-2 text-right whitespace-nowrap">
                        {fmtVal(val, metricInfo.isRatio, !metricInfo.isRatio ? curr : "")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
