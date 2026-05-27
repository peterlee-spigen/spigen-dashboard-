"use client";
import { useState, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { detectFileType, FileType } from "@/lib/parsers/detect-type";
import { parseSpRow } from "@/lib/parsers/sp-campaigns";
import { parseSbRow } from "@/lib/parsers/sb-campaigns";
import { parseSdRow } from "@/lib/parsers/sd-campaigns";
import { parseAttributionRow } from "@/lib/parsers/attribution";
import { parseOrderRow } from "@/lib/parsers/orders";
import { parseListingRow } from "@/lib/parsers/listing";
import { parseInventoryRow } from "@/lib/parsers/inventory";
import { parseTrafficRow } from "@/lib/parsers/traffic";
import { appendRows, clearAllTables, upsertRows } from "@/lib/local-store";

interface UploadResult {
  type?: string;
  inserted: number;
  skipped: number;
  total: number;
  error?: string;
}

const TYPE_LABELS: Record<string, string> = {
  sp: "SP Campaigns",
  sb: "SB Campaigns",
  sd: "SD Campaigns",
  attribution: "Attribution",
  orders: "Orders",
  listing: "Listing",
  inventory: "Inventory",
  traffic: "Traffic",
};

async function parseFile(file: File): Promise<Record<string, unknown>[]> {
  const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
  if (isXlsx) {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { defval: "" });
  }
  const text = await file.text();
  const result = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
  return result.data;
}

async function ingest(type: FileType, rawRows: Record<string, unknown>[]): Promise<{ inserted: number; skipped: number }> {
  if (type === "sp") {
    const parsed = rawRows.map((r) => parseSpRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    // sales_1d/7d/30d, top_of_search_impression_share 는 DB 컬럼 없음 → meta 로 이동
    const rows = parsed.map(({ sales_1d, sales_7d, sales_30d, top_of_search_impression_share, ...rest }) => ({
      ...rest,
      type: "SP" as const,
      cost_type: "CPC",
      new_to_brand_sales: 0,
      new_to_brand_purchases: 0,
      meta: { sales_1d, sales_7d, sales_30d, top_of_search_impression_share },
    }));
    // 배치 내 중복 키 제거 (date|SP|campaign_id 기준)
    const deduped = [...new Map(rows.map((r) => [`${r.date}|SP|${r.campaign_id}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("ad_campaigns", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "sb") {
    const parsed = rawRows.map((r) => parseSbRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const rows = parsed.map((r) => ({ ...r, type: "SB" as const }));
    const deduped = [...new Map(rows.map((r) => [`${r.date}|SB|${r.campaign_id}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("ad_campaigns", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "sd") {
    const parsed = rawRows.map((r) => parseSdRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const rows = parsed.map((r) => ({ ...r, type: "SD" as const, budget_type: "" }));
    const deduped = [...new Map(rows.map((r) => [`${r.date}|SD|${r.campaign_id}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("ad_campaigns", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "attribution") {
    const parsed = rawRows.map((r) => parseAttributionRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const deduped = [...new Map(parsed.map((r) => [`${r.date}|${r.campaign_id}|${r.product_asin}|${r.publisher}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("attribution", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "orders") {
    const parsed = rawRows.map((r) => parseOrderRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const skipped = rawRows.length - parsed.length;
    await appendRows("orders", parsed);
    return { inserted: parsed.length, skipped };
  }
  if (type === "listing") {
    const parsed = rawRows.map((r) => parseListingRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    // 같은 CSV 내 중복 ASIN 제거 (마지막 행 우선)
    const deduped = [...new Map(parsed.map((r) => [r.asin, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("listing", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "inventory") {
    const parsed = rawRows.map((r) => parseInventoryRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const deduped = [...new Map(parsed.map((r) => [`${r.report_date}|${r.sku}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("inventory", deduped);
    return { inserted: deduped.length, skipped };
  }
  if (type === "traffic") {
    const parsed = rawRows.map((r) => parseTrafficRow(r as Record<string, unknown>)).filter((r): r is NonNullable<typeof r> => !!r);
    const deduped = [...new Map(parsed.map((r) => [`${r.report_date}|${r.child_asin}`, r])).values()];
    const skipped = rawRows.length - deduped.length;
    await upsertRows("traffic", deduped);
    return { inserted: deduped.length, skipped };
  }
  return { inserted: 0, skipped: rawRows.length };
}

export default function UploadPage() {
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    const newResults: UploadResult[] = [];

    for (const file of Array.from(files)) {
      try {
        const rows = await parseFile(file);
        if (rows.length === 0) {
          newResults.push({ error: "파일이 비어 있습니다.", inserted: 0, skipped: 0, total: 0, type: file.name });
          continue;
        }
        const headers = Object.keys(rows[0] as object);
        const type = detectFileType(headers);
        if (!type) {
          newResults.push({
            error: `파일 유형 감지 실패. 컬럼: ${headers.slice(0, 5).join(", ")}`,
            inserted: 0, skipped: 0, total: rows.length, type: file.name,
          });
          continue;
        }
        const { inserted, skipped } = await ingest(type, rows);
        newResults.push({ type, inserted, skipped, total: rows.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        newResults.push({
          error: `처리 실패: ${msg}`,
          inserted: 0, skipped: 0, total: 0, type: file.name,
        });
      }
    }

    setResults((prev) => [...newResults, ...prev]);
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files);
  }

  async function handleClearAll() {
    if (!confirm("저장된 모든 데이터를 삭제할까요?")) return;
    await clearAllTables();
    setResults([]);
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">데이터 업로드</h1>
          <p className="text-sm text-neutral-500 mt-1">
            CSV 또는 XLSX 파일을 드래그하거나 선택하세요. 모든 데이터는 Supabase에 저장됩니다.
          </p>
        </div>
        <button
          onClick={handleClearAll}
          className="text-xs px-3 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-red-600 hover:border-red-300"
        >
          전체 삭제
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }}
        />
        {uploading ? (
          <p className="text-blue-500 font-medium">업로드 중...</p>
        ) : (
          <>
            <p className="text-neutral-500 dark:text-neutral-400 font-medium">파일을 여기에 드래그하거나 클릭해서 선택</p>
            <p className="text-xs text-neutral-400 mt-1">CSV, XLSX 지원 · 여러 파일 동시 업로드 가능</p>
          </>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">업로드 결과</h2>
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm ${
                r.error
                  ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              }`}
            >
              <div>
                <span className="font-medium text-neutral-800 dark:text-neutral-100">
                  {r.type ? (TYPE_LABELS[r.type] ?? r.type) : "—"}
                </span>
                {r.error ? (
                  <span className="ml-2 text-red-600 dark:text-red-400">{r.error}</span>
                ) : (
                  <span className="ml-2 text-neutral-500">
                    {r.inserted.toLocaleString()}건 저장, {r.skipped.toLocaleString()}건 스킵
                  </span>
                )}
              </div>
              <span className="text-xs text-neutral-400">{r.total.toLocaleString()}행</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">자동 감지 대상 파일</p>
        <div className="grid grid-cols-2 gap-1 text-xs text-neutral-500">
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="font-mono text-neutral-400 w-16">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
