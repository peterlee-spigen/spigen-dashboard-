"use client";
import { useState } from "react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  sortable?: boolean;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns, data, pageSize = 50, onRowClick,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
    setPage(1);
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const av = a[sortKey] ?? 0;
        const bv = b[sortKey] ?? 0;
        const diff = Number(av) - Number(bv);
        return sortDir === "asc" ? diff : -diff;
      })
    : data;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const sliced = sorted.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                onClick={() => col.sortable !== false && handleSort(String(col.key))}
                className={`px-3 py-2.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide whitespace-nowrap ${
                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                } ${col.sortable !== false ? "cursor-pointer select-none hover:text-blue-600" : ""}`}
              >
                {col.header}
                {sortKey === String(col.key) && (sortDir === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sliced.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-neutral-100 dark:border-neutral-800 transition-colors ${
                onRowClick ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950" : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-3 py-2.5 text-neutral-800 dark:text-neutral-200 ${
                    col.align === "right" ? "text-right tabular-nums" : col.align === "center" ? "text-center" : ""
                  }`}
                >
                  {col.render ? col.render(row) : String(row[String(col.key)] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
          {sliced.length === 0 && (
            <tr><td colSpan={columns.length} className="px-3 py-8 text-center text-neutral-400">데이터 없음</td></tr>
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-500">
          <span>{sorted.length}건 중 {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              ‹
            </button>
            <span className="px-2 py-1">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800">
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
