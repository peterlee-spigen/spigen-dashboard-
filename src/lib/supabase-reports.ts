import { createClient } from '@supabase/supabase-js'
import type { CountryReport, CategoryReport } from '@/lib/parsers/report-by-country'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    global: {
      fetch: (url, options) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  }
)

type MetricRow = {
  sheet_name: string
  group_key: string
  sub_category: string
  month: string
  impressions: number | null
  clicks: number | null
  ctr: string | null
  spend: number | null
  acos: string | null
  cvr: string | null
  orders: number | null
  sales: number | null
  promoted_sales: number | null
  halo_sales: number | null
}

function rowsToReports<T extends { months: string[] }>(
  rows: MetricRow[],
  keyField: 'country' | 'category'
): T[] {
  const grouped = new Map<string, MetricRow[]>()
  for (const row of rows) {
    const mapKey = `${row.group_key}||${row.sub_category}`
    const arr = grouped.get(mapKey) ?? []
    arr.push(row)
    grouped.set(mapKey, arr)
  }

  const result: T[] = []
  for (const [mapKey, keyRows] of grouped) {
    const [groupKey, subCategory] = mapKey.split('||')
    const sorted = keyRows.sort((a, b) => a.month.localeCompare(b.month))
    const months = sorted.map((r) => r.month)
    result.push({
      [keyField]: groupKey,
      subCategory: subCategory ?? '',
      months,
      campaign: {
        impressions: sorted.map((r) => r.impressions),
        clicks: sorted.map((r) => r.clicks),
        ctr: sorted.map((r) => r.ctr),
        spend: sorted.map((r) => r.spend),
        acos: sorted.map((r) => r.acos),
        cvr: sorted.map((r) => r.cvr),
        orders: sorted.map((r) => r.orders),
        sales: sorted.map((r) => r.sales),
      },
      adSales: {
        promotedSales: sorted.map((r) => r.promoted_sales),
        haloSales: sorted.map((r) => r.halo_sales),
      },
    } as T)
  }
  return result
}

export async function getReportByCountryFromDB(): Promise<CountryReport[]> {
  const { data, error } = await supabase
    .from('report_metrics')
    .select('*')
    .eq('sheet_name', '국가별')
    .order('group_key')
    .order('month')

  if (error) throw new Error(`Supabase error: ${error.message}`)
  return rowsToReports<CountryReport>(data ?? [], 'country')
}

export async function getReportByCategoryFromDB(
  sheetName: string
): Promise<CategoryReport[]> {
  const { data, error } = await supabase
    .from('report_metrics')
    .select('*')
    .eq('sheet_name', sheetName)
    .order('group_key')
    .order('month')

  if (error) throw new Error(`Supabase error: ${error.message}`)
  return rowsToReports<CategoryReport>(data ?? [], 'category')
}

export async function getLastSync(): Promise<{ synced_at: string; status: string } | null> {
  const { data } = await supabase
    .from('sync_log')
    .select('synced_at, status')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()
  return data
}
