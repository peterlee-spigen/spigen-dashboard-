import { supabase } from "@/lib/supabase";

export type TableName =
  | "ad_campaigns"
  | "attribution"
  | "orders"
  | "listing"
  | "inventory"
  | "traffic";

const CONFLICT_COLUMNS: Record<TableName, string> = {
  ad_campaigns: "date,type,campaign_id",
  attribution:  "date,campaign_id,product_asin,publisher",
  orders:       "order_id,sku,purchase_date",
  listing:      "asin",
  inventory:    "report_date,sku",
  traffic:      "report_date,child_asin",
};

function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (typeof e === "object" && e !== null) {
    const { message, details, hint, code } = e as Record<string, unknown>;
    const parts = [message, details, hint].filter(Boolean).join(" | ");
    return new Error(parts || `Supabase error (code: ${code ?? "unknown"})`);
  }
  return new Error(String(e));
}

export async function getTable<T = Record<string, unknown>>(name: TableName): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const all: T[] = [];
  while (true) {
    const { data, error } = await supabase
      .from(name)
      .select("*")
      .range(from, from + PAGE - 1);
    if (error) throw toError(error);
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export async function upsertRows(
  name: TableName,
  rows: object[],
): Promise<{ inserted: number; replaced: number }> {
  if (rows.length === 0) return { inserted: 0, replaced: 0 };
  const { error } = await supabase
    .from(name)
    .upsert(rows as Record<string, unknown>[], { onConflict: CONFLICT_COLUMNS[name] });
  if (error) throw toError(error);
  return { inserted: rows.length, replaced: 0 };
}

export async function appendRows(name: TableName, rows: object[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from(name)
    .upsert(rows as Record<string, unknown>[], {
      onConflict: CONFLICT_COLUMNS[name],
      ignoreDuplicates: true,
    });
  if (error) throw toError(error);
}

export async function clearAllTables(): Promise<void> {
  const tables: TableName[] = ["ad_campaigns", "attribution", "orders", "listing", "inventory", "traffic"];
  await Promise.all(
    tables.map((t) => supabase.from(t).delete().neq("id", 0)),
  );
}

export async function getTableCount(name: TableName): Promise<number> {
  const { count, error } = await supabase
    .from(name)
    .select("*", { count: "exact", head: true });
  if (error) throw toError(error);
  return count ?? 0;
}
