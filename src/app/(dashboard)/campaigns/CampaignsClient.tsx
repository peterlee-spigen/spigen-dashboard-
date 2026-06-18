'use client'

import { useState, useMemo, useRef } from 'react'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import KpiCard from '@/components/cards/KpiCard'
import type { SpRow, SbRow, SdRow } from '@/lib/supabase-campaigns'

type Tab = 'sp' | 'sb' | 'sd'
type Range = '30' | '90' | 'all'

interface Props { sp: SpRow[]; sb: SbRow[]; sd: SdRow[] }

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('de-DE', { maximumFractionDigits: decimals })
}
function eur(n: number) { return `€${fmt(n, 2)}` }
function pct(n: number) { return `${fmt(n * 100, 2)}%` }

function filterByRange<T extends { date: string }>(rows: T[], range: Range): T[] {
  if (range === 'all') return rows
  const days = parseInt(range)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return rows.filter(r => r.date >= cutoffStr)
}

// ── SP 집계 ──────────────────────────────────────────────────────────
function spKpis(rows: SpRow[]) {
  const imp = rows.reduce((s, r) => s + r.impressions, 0)
  const clk = rows.reduce((s, r) => s + r.clicks, 0)
  const cost = rows.reduce((s, r) => s + r.cost, 0)
  const sales = rows.reduce((s, r) => s + r.sales_14d, 0)
  const orders = rows.reduce((s, r) => s + r.purchases_14d, 0)
  const roas = cost > 0 ? sales / cost : 0
  const ctr = imp > 0 ? clk / imp : 0
  return { imp, clk, cost, sales, orders, roas, ctr }
}

function spChartData(rows: SpRow[]) {
  const byDate = new Map<string, { cost: number; sales: number }>()
  for (const r of rows) {
    const prev = byDate.get(r.date) ?? { cost: 0, sales: 0 }
    byDate.set(r.date, { cost: prev.cost + r.cost, sales: prev.sales + r.sales_14d })
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), ...v, roas: v.cost > 0 ? +(v.sales / v.cost).toFixed(2) : 0 }))
}

function spTableData(rows: SpRow[]) {
  const map = new Map<string, { name: string; cost: number; sales: number; orders: number; imp: number; clk: number }>()
  for (const r of rows) {
    const key = r.campaign_id
    const prev = map.get(key) ?? { name: r.campaign_name ?? key, cost: 0, sales: 0, orders: 0, imp: 0, clk: 0 }
    map.set(key, {
      name: prev.name,
      cost: prev.cost + r.cost,
      sales: prev.sales + r.sales_14d,
      orders: prev.orders + r.purchases_14d,
      imp: prev.imp + r.impressions,
      clk: prev.clk + r.clicks,
    })
  }
  return [...map.values()]
    .map(v => ({ ...v, roas: v.cost > 0 ? v.sales / v.cost : 0, acos: v.sales > 0 ? v.cost / v.sales : 0 }))
    .sort((a, b) => b.sales - a.sales)
}

// ── SB 집계 ──────────────────────────────────────────────────────────
function sbKpis(rows: SbRow[]) {
  const imp = rows.reduce((s, r) => s + r.impressions, 0)
  const clk = rows.reduce((s, r) => s + r.clicks, 0)
  const cost = rows.reduce((s, r) => s + r.cost, 0)
  const sales = rows.reduce((s, r) => s + r.sales, 0)
  const orders = rows.reduce((s, r) => s + r.purchases, 0)
  const ntb = rows.reduce((s, r) => s + r.new_to_brand_purchases, 0)
  const roas = cost > 0 ? sales / cost : 0
  const ctr = imp > 0 ? clk / imp : 0
  return { imp, clk, cost, sales, orders, roas, ctr, ntb }
}

function sbChartData(rows: SbRow[]) {
  const byDate = new Map<string, { cost: number; sales: number; ntb: number }>()
  for (const r of rows) {
    const prev = byDate.get(r.date) ?? { cost: 0, sales: 0, ntb: 0 }
    byDate.set(r.date, { cost: prev.cost + r.cost, sales: prev.sales + r.sales, ntb: prev.ntb + r.new_to_brand_purchases })
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), ...v, roas: v.cost > 0 ? +(v.sales / v.cost).toFixed(2) : 0 }))
}

function sbTableData(rows: SbRow[]) {
  const map = new Map<string, { name: string; cost: number; sales: number; orders: number; ntb: number; imp: number }>()
  for (const r of rows) {
    const key = r.campaign_id
    const prev = map.get(key) ?? { name: r.campaign_name ?? key, cost: 0, sales: 0, orders: 0, ntb: 0, imp: 0 }
    map.set(key, { name: prev.name, cost: prev.cost + r.cost, sales: prev.sales + r.sales, orders: prev.orders + r.purchases, ntb: prev.ntb + r.new_to_brand_purchases, imp: prev.imp + r.impressions })
  }
  return [...map.values()]
    .map(v => ({ ...v, roas: v.cost > 0 ? v.sales / v.cost : 0, acos: v.sales > 0 ? v.cost / v.sales : 0 }))
    .sort((a, b) => b.sales - a.sales)
}

// ── SD 집계 ──────────────────────────────────────────────────────────
function sdKpis(rows: SdRow[]) {
  const imp = rows.reduce((s, r) => s + r.impressions_views, 0)
  const clk = rows.reduce((s, r) => s + r.clicks, 0)
  const cost = rows.reduce((s, r) => s + r.cost, 0)
  const sales = rows.reduce((s, r) => s + r.sales, 0)
  const orders = rows.reduce((s, r) => s + r.purchases, 0)
  const dpv = rows.reduce((s, r) => s + r.detail_page_views, 0)
  const roas = cost > 0 ? sales / cost : 0
  const ctr = imp > 0 ? clk / imp : 0
  return { imp, clk, cost, sales, orders, roas, ctr, dpv }
}

function sdChartData(rows: SdRow[]) {
  const byDate = new Map<string, { cost: number; sales: number; dpv: number }>()
  for (const r of rows) {
    const prev = byDate.get(r.date) ?? { cost: 0, sales: 0, dpv: 0 }
    byDate.set(r.date, { cost: prev.cost + r.cost, sales: prev.sales + r.sales, dpv: prev.dpv + r.detail_page_views })
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date: date.slice(5), ...v, roas: v.cost > 0 ? +(v.sales / v.cost).toFixed(2) : 0 }))
}

function sdTableData(rows: SdRow[]) {
  const map = new Map<string, { name: string; cost: number; sales: number; orders: number; dpv: number; imp: number }>()
  for (const r of rows) {
    const key = r.campaign_id
    const prev = map.get(key) ?? { name: r.campaign_name ?? key, cost: 0, sales: 0, orders: 0, dpv: 0, imp: 0 }
    map.set(key, { name: prev.name, cost: prev.cost + r.cost, sales: prev.sales + r.sales, orders: prev.orders + r.purchases, dpv: prev.dpv + r.detail_page_views, imp: prev.imp + r.impressions_views })
  }
  return [...map.values()]
    .map(v => ({ ...v, roas: v.cost > 0 ? v.sales / v.cost : 0, acos: v.sales > 0 ? v.cost / v.sales : 0 }))
    .sort((a, b) => b.sales - a.sales)
}

// ── 공통 컴포넌트 ────────────────────────────────────────────────────
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-3xl">📂</div>
      <p className="text-neutral-500 dark:text-neutral-400">아직 데이터가 없습니다</p>
      <p className="text-xs text-neutral-400 dark:text-neutral-500">Amazon Ads에서 받은 CSV 파일을 업로드하세요</p>
      <button
        onClick={onUpload}
        className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
      >
        CSV 업로드
      </button>
    </div>
  )
}

function UploadModal({ onClose, onDone }: { onClose: () => void; onDone: (msg: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload-campaigns', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '업로드 실패')
      onDone(`${json.type} 캠페인 ${json.rows}행 업로드 완료`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류 발생')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold mb-1">캠페인 CSV 업로드</h3>
        <p className="text-xs text-neutral-500 mb-4">SP / SB / SD 파일을 각각 업로드하세요. 유형은 자동으로 감지됩니다.</p>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl py-8 cursor-pointer hover:border-blue-500 transition-colors">
          <span className="text-2xl mb-2">⬆️</span>
          <span className="text-sm text-neutral-500">{loading ? '업로드 중...' : 'CSV 파일 선택'}</span>
          <input type="file" accept=".csv" className="hidden" onChange={handleFile} disabled={loading} />
        </label>
        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">닫기</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────────
export default function CampaignsClient({ sp, sb, sd }: Props) {
  const [tab, setTab] = useState<Tab>('sp')
  const [range, setRange] = useState<Range>('30')
  const [showUpload, setShowUpload] = useState(false)
  const [toast, setToast] = useState('')

  const filteredSp = useMemo(() => filterByRange(sp, range), [sp, range])
  const filteredSb = useMemo(() => filterByRange(sb, range), [sb, range])
  const filteredSd = useMemo(() => filterByRange(sd, range), [sd, range])

  const spK = useMemo(() => spKpis(filteredSp), [filteredSp])
  const sbK = useMemo(() => sbKpis(filteredSb), [filteredSb])
  const sdK = useMemo(() => sdKpis(filteredSd), [filteredSd])

  const spChart = useMemo(() => spChartData(filteredSp), [filteredSp])
  const sbChart = useMemo(() => sbChartData(filteredSb), [filteredSb])
  const sdChart = useMemo(() => sdChartData(filteredSd), [filteredSd])

  const spTable = useMemo(() => spTableData(filteredSp), [filteredSp])
  const sbTable = useMemo(() => sbTableData(filteredSb), [filteredSb])
  const sdTable = useMemo(() => sdTableData(filteredSd), [filteredSd])

  function handleDone(msg: string) {
    setShowUpload(false)
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
    // 데이터 새로고침
    window.location.reload()
  }

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: 'sp', label: 'SP (Sponsored Products)', color: 'bg-blue-600' },
    { key: 'sb', label: 'SB (Sponsored Brands)', color: 'bg-violet-600' },
    { key: 'sd', label: 'SD (Sponsored Display)', color: 'bg-emerald-600' },
  ]

  const RANGES: { key: Range; label: string }[] = [
    { key: '30', label: '최근 30일' },
    { key: '90', label: '최근 90일' },
    { key: 'all', label: '전체' },
  ]

  const activeColor = tab === 'sp' ? 'bg-blue-600' : tab === 'sb' ? 'bg-violet-600' : 'bg-emerald-600'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">캠페인 성과</h1>
          <p className="text-xs text-neutral-400 mt-0.5">SP · SB · SD 캠페인별 데이터를 분석합니다</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm rounded-lg hover:opacity-80 transition-opacity"
        >
          <span>⬆</span> CSV 업로드
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              tab === t.key
                ? `${t.color} text-white`
                : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 기간 필터 */}
      <div className="flex gap-2">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              range === r.key
                ? `${activeColor} border-transparent text-white`
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-400'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* SP 탭 */}
      {tab === 'sp' && (
        filteredSp.length === 0 ? <EmptyState onUpload={() => setShowUpload(true)} /> : (
          <div className="space-y-6">
            {/* KPI 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard label="노출" value={fmt(spK.imp)} />
              <KpiCard label="클릭" value={fmt(spK.clk)} />
              <KpiCard label="CTR" value={pct(spK.ctr)} />
              <KpiCard label="광고비" value={eur(spK.cost)} highlight />
              <KpiCard label="광고매출 (14d)" value={eur(spK.sales)} highlight />
              <KpiCard label="ROAS" value={spK.roas.toFixed(2)} unit="x" highlight={spK.roas >= 3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="주문 수 (14d)" value={fmt(spK.orders)} />
              <KpiCard label="ACOS" value={spK.sales > 0 ? pct(spK.cost / spK.sales) : '—'} />
            </div>

            {/* 차트 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">광고비 vs 광고매출 (일별)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={spChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Legend />
                    <Bar dataKey="sales" name="광고매출" fill="#3b82f6" radius={[3,3,0,0]} />
                    <Bar dataKey="cost" name="광고비" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">ROAS 추이</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={spChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}x`} />
                    <Tooltip formatter={(v: number) => `${v}x`} />
                    <Line type="monotone" dataKey="roas" name="ROAS" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">캠페인별 성과</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 uppercase">
                      <th className="text-left px-5 py-3">캠페인명</th>
                      <th className="text-right px-4 py-3">노출</th>
                      <th className="text-right px-4 py-3">클릭</th>
                      <th className="text-right px-4 py-3">광고비</th>
                      <th className="text-right px-4 py-3">매출(14d)</th>
                      <th className="text-right px-4 py-3">ROAS</th>
                      <th className="text-right px-4 py-3">주문(14d)</th>
                      <th className="text-right px-4 py-3">ACOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {spTable.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-5 py-3 max-w-xs truncate text-xs text-neutral-700 dark:text-neutral-300">{row.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.imp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.clk)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{eur(row.cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs font-medium">{eur(row.sales)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          <span className={row.roas >= 3 ? 'text-green-600 font-semibold' : row.roas >= 1 ? 'text-yellow-600' : 'text-red-500'}>
                            {row.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.orders)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{row.acos > 0 ? pct(row.acos) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* SB 탭 */}
      {tab === 'sb' && (
        filteredSb.length === 0 ? <EmptyState onUpload={() => setShowUpload(true)} /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard label="노출" value={fmt(sbK.imp)} />
              <KpiCard label="클릭" value={fmt(sbK.clk)} />
              <KpiCard label="CTR" value={pct(sbK.ctr)} />
              <KpiCard label="광고비" value={eur(sbK.cost)} highlight />
              <KpiCard label="광고매출" value={eur(sbK.sales)} highlight />
              <KpiCard label="ROAS" value={sbK.roas.toFixed(2)} unit="x" highlight={sbK.roas >= 3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="신규고객 주문 (NTB)" value={fmt(sbK.ntb)} sub="New-to-Brand" />
              <KpiCard label="전체 주문" value={fmt(sbK.orders)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">광고비 vs 광고매출 (일별)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sbChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Legend />
                    <Bar dataKey="sales" name="광고매출" fill="#7c3aed" radius={[3,3,0,0]} />
                    <Bar dataKey="cost" name="광고비" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">신규고객(NTB) 주문 추이</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sbChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ntb" name="NTB 주문" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">캠페인별 성과</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 uppercase">
                      <th className="text-left px-5 py-3">캠페인명</th>
                      <th className="text-right px-4 py-3">노출</th>
                      <th className="text-right px-4 py-3">광고비</th>
                      <th className="text-right px-4 py-3">매출</th>
                      <th className="text-right px-4 py-3">ROAS</th>
                      <th className="text-right px-4 py-3">주문</th>
                      <th className="text-right px-4 py-3">NTB 주문</th>
                      <th className="text-right px-4 py-3">ACOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {sbTable.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-5 py-3 max-w-xs truncate text-xs text-neutral-700 dark:text-neutral-300">{row.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.imp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{eur(row.cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs font-medium">{eur(row.sales)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          <span className={row.roas >= 3 ? 'text-green-600 font-semibold' : row.roas >= 1 ? 'text-yellow-600' : 'text-red-500'}>
                            {row.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.orders)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs text-violet-600 font-medium">{fmt(row.ntb)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{row.acos > 0 ? pct(row.acos) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* SD 탭 */}
      {tab === 'sd' && (
        filteredSd.length === 0 ? <EmptyState onUpload={() => setShowUpload(true)} /> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard label="노출(뷰)" value={fmt(sdK.imp)} />
              <KpiCard label="클릭" value={fmt(sdK.clk)} />
              <KpiCard label="CTR" value={pct(sdK.ctr)} />
              <KpiCard label="광고비" value={eur(sdK.cost)} highlight />
              <KpiCard label="광고매출" value={eur(sdK.sales)} highlight />
              <KpiCard label="ROAS" value={sdK.roas.toFixed(2)} unit="x" highlight={sdK.roas >= 3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <KpiCard label="상세페이지 조회" value={fmt(sdK.dpv)} sub="Detail Page Views" />
              <KpiCard label="주문" value={fmt(sdK.orders)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">광고비 vs 광고매출 (일별)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={sdChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => eur(v)} />
                    <Legend />
                    <Bar dataKey="sales" name="광고매출" fill="#10b981" radius={[3,3,0,0]} />
                    <Bar dataKey="cost" name="광고비" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5">
                <h3 className="text-sm font-semibold mb-4">상세페이지 조회 추이</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={sdChart} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="dpv" name="상세페이지 조회" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                <h3 className="text-sm font-semibold">캠페인별 성과</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 uppercase">
                      <th className="text-left px-5 py-3">캠페인명</th>
                      <th className="text-right px-4 py-3">노출</th>
                      <th className="text-right px-4 py-3">광고비</th>
                      <th className="text-right px-4 py-3">매출</th>
                      <th className="text-right px-4 py-3">ROAS</th>
                      <th className="text-right px-4 py-3">주문</th>
                      <th className="text-right px-4 py-3">DPV</th>
                      <th className="text-right px-4 py-3">ACOS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {sdTable.map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-5 py-3 max-w-xs truncate text-xs text-neutral-700 dark:text-neutral-300">{row.name}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.imp)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{eur(row.cost)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs font-medium">{eur(row.sales)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">
                          <span className={row.roas >= 3 ? 'text-green-600 font-semibold' : row.roas >= 1 ? 'text-yellow-600' : 'text-red-500'}>
                            {row.roas.toFixed(2)}x
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{fmt(row.orders)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs text-emerald-600">{fmt(row.dpv)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-xs">{row.acos > 0 ? pct(row.acos) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* 업로드 모달 */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onDone={handleDone} />}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-neutral-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
