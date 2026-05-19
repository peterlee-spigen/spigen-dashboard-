/**
 * 3가지 날짜 포맷을 YYYY-MM-DD로 통일
 * - YYYY-MM-DD (SP/SB/SD)
 * - YYYYMMDD (attribution/inventory/traffic)
 * - ISO 8601 (orders: 2026-03-01T23:59:46+00:00)
 */
export function normalizeDate(raw: string | number | undefined | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO 8601
  if (s.includes("T")) return s.slice(0, 10);

  // YYYYMMDD
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  return null;
}

export function parseFloat_(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace("%", "").replace(",", ".").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export function parseInt_(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(",", "").trim();
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}
