import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getReportByCountry, getReportByCategory } from '@/lib/parsers/report-by-country'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SHEETS = [
  { sheetName: '국가별', isCountry: true },
  { sheetName: 'MPC', isCountry: false },
  { sheetName: 'CP', isCountry: false },
  { sheetName: 'SDA', isCountry: false },
  { sheetName: 'Auto', isCountry: false },
  { sheetName: 'Power', isCountry: false },
]

export async function POST(req: NextRequest) {
  // Vercel Cron 또는 수동 호출 모두 허용 (SYNC_SECRET이 없으면 개방)
  const secret = process.env.SYNC_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') ?? ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const syncedAt = new Date().toISOString()
  let totalRows = 0

  try {
    for (const { sheetName, isCountry } of SHEETS) {
      const reports = isCountry
        ? await getReportByCountry()
        : await getReportByCategory(`Report(${sheetName})`)

      const rows = reports.flatMap((report) => {
        const groupKey = isCountry
          ? (report as { country: string }).country
          : (report as { category: string }).category

        return report.months.map((month, i) => ({
          sheet_name: sheetName,
          group_key: groupKey,
          month,
          impressions: report.campaign.impressions[i] ?? null,
          clicks: report.campaign.clicks[i] ?? null,
          ctr: report.campaign.ctr[i] ?? null,
          spend: report.campaign.spend[i] ?? null,
          acos: report.campaign.acos[i] ?? null,
          cvr: report.campaign.cvr[i] ?? null,
          orders: report.campaign.orders[i] ?? null,
          sales: report.campaign.sales[i] ?? null,
          promoted_sales: report.adSales.promotedSales[i] ?? null,
          halo_sales: report.adSales.haloSales[i] ?? null,
          synced_at: syncedAt,
        }))
      })

      if (rows.length === 0) continue

      const { error } = await supabase
        .from('report_metrics')
        .upsert(rows, { onConflict: 'sheet_name,group_key,month' })

      if (error) throw new Error(`Upsert failed for ${sheetName}: ${error.message}`)
      totalRows += rows.length
    }

    await supabase.from('sync_log').insert({
      status: 'success',
      message: `Synced ${totalRows} rows`,
      rows_upserted: totalRows,
    })

    return NextResponse.json({ success: true, rows_upserted: totalRows })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('sync_log').insert({ status: 'error', message, rows_upserted: 0 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Vercel Cron GET 지원
export const GET = POST
