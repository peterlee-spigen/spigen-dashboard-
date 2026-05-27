"use client";
import { useEffect, useState } from "react";
import DataTable, { Column } from "@/components/tables/DataTable";
import KpiCard from "@/components/cards/KpiCard";
import { useFilterStore } from "@/store/filter-store";
import { getInventory, getInventorySummary, getLatestReportDate, type InventorySummary, type InventoryRow } from "@/lib/queries/inventory";

function RiskBadge({ level, days }: { level: string; days: number | null }) {
  if (level === "danger") return <span className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2 py-0.5 rounded text-xs font-medium">🔴 {days === 0 ? "품절" : `${days}일`}</span>;
  if (level === "warning") return <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 px-2 py-0.5 rounded text-xs font-medium">⚠️ {days}일</span>;
  return <span className="text-green-600 text-xs">{days !== null ? `${days}일` : "—"}</span>;
}

export default function InventoryPage() {
  const { asinQuery } = useFilterStore();
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [reportDate, setReportDate] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getLatestReportDate()
      .then(async (date) => {
        const d = date ?? "";
        if (cancelled) return;
        setReportDate(d);
        if (d) {
          const [s, r] = await Promise.all([
            getInventorySummary(d),
            getInventory(d, asinQuery || undefined),
          ]);
          if (!cancelled) { setSummary(s); setRows(r); }
        } else {
          if (!cancelled) { setSummary(null); setRows([]); }
        }
      })
      .catch(() => { if (!cancelled) { setSummary(null); setRows([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [asinQuery]);

  const columns: Column<InventoryRow>[] = [
    { key: "sku", header: "SKU", render: r => <span className="font-mono text-xs">{r.sku}</span> },
    { key: "asin", header: "ASIN", render: r => <span className="font-mono text-xs">{r.asin}</span> },
    { key: "product_name", header: "상품명", render: r => <span className="max-w-xs truncate block" title={r.product_name}>{r.product_name}</span>, sortable: false },
    { key: "your_price", header: "가격", align: "right", render: r => `€${r.your_price.toFixed(2)}` },
    { key: "afn_fulfillable", header: "가용", align: "right" },
    { key: "afn_reserved", header: "예약됨", align: "right" },
    { key: "afn_inbound_total", header: "입고중", align: "right" },
    { key: "afn_total", header: "총재고", align: "right" },
    { key: "status", header: "상태" },
    { key: "risk_level", header: "위험도", align: "center", render: r => <RiskBadge level={r.risk_level} days={r.risk_days} /> },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">재고 관리</h1>
        {reportDate && <span className="text-xs text-neutral-400">기준일: {reportDate}</span>}
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <KpiCard label="전체 SKU" value={summary.totalSkus.toLocaleString()} />
          <KpiCard label="가용재고 0 SKU" value={summary.outOfStockSkus.toLocaleString()} highlight={summary.outOfStockSkus > 0} />
          <KpiCard label="입고 예정 SKU" value={summary.inboundSkus.toLocaleString()} />
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-neutral-400">로딩 중...</div> : (
          <DataTable columns={columns as unknown as Column<Record<string, unknown>>[]} data={rows as unknown as Record<string, unknown>[]} />
        )}
      </div>
    </div>
  );
}
