"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getRiskAlertItems, type RiskAlertItem } from "@/lib/queries/inventory";

export default function InventoryRiskBanner() {
  const [items, setItems] = useState<RiskAlertItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    getRiskAlertItems().then(({ items }) => setItems(items));
  }, []);

  if (items.length === 0) return null;

  const dangerCount = items.filter((i) => i.risk_level === "danger").length;
  const warningCount = items.filter((i) => i.risk_level === "warning").length;

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-600 dark:text-red-400 text-base">⚠️</span>
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            재고 위험 알림
          </span>
          <span className="flex gap-1.5">
            {dangerCount > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                품절 {dangerCount}
              </span>
            )}
            {warningCount > 0 && (
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                14일 미만 {warningCount}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="text-xs text-red-600 dark:text-red-400 underline underline-offset-2 hover:text-red-800 dark:hover:text-red-200"
          >
            재고 관리 →
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {collapsed ? "펼치기 ▼" : "접기 ▲"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.asin}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border ${
                item.risk_level === "danger"
                  ? "bg-red-100 border-red-300 dark:bg-red-900/50 dark:border-red-700"
                  : "bg-yellow-50 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700"
              }`}
            >
              <span>{item.risk_level === "danger" ? "🔴" : "⚠️"}</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {item.asin}
              </span>
              {item.product_name && (
                <span className="text-neutral-500 dark:text-neutral-400 max-w-[160px] truncate">
                  {item.product_name}
                </span>
              )}
              <span
                className={`font-semibold ${
                  item.risk_level === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : "text-yellow-700 dark:text-yellow-400"
                }`}
              >
                {item.risk_level === "danger"
                  ? `품절 (재고 ${item.afn_fulfillable})`
                  : `${item.risk_days}일`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
