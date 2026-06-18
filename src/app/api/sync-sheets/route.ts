import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getReportByCountry } from '@/lib/parsers/report-by-country'
import { getFilteredCampaignReports } from '@/lib/parsers/filtered-campaign'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 필터_Campaign 카테고리 → 대시보드 sheet_name 매핑
const CATEGORY_SHEET_MAP: Record<string, string[]> = {
  MPC:   ['전략폰', '애플', '삼성A', '삼성B', '아웃도어'],
  CP:    ['CP'],
  SDA:   ['스디악'],
  Power: ['파워'],
  Auto:  [],
}

export async function POST(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (isVercelCron) {
    const secret = process.env.SYNC_SECRET
    const auth = req.headers.get('authorization') ?? ''
    if (secret && auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const syncedAt = new Date().toISOString()
  let totalRows = 0

  try {
    // 1. 국가별 데이터 동기화
    const countryReports = await getReportByCountry()
    const countryRows = countryReports.flatMap((report) =>
      report.months.map((month, i) => ({
        sheet_name: '국가별',
        group_key: report.country,
        sub_category: '',
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
    )
    if (countryRows.length > 0) {
      const { error } = await supabase
        .from('report_metrics')
        .upsert(countryRows, { onConflict: 'sheet_name,group_key,sub_category,month' })
      if (error) throw new Error(`Upsert failed for 국가별: ${error.message}`)
      totalRows += countryRows.length
    }

    // 2. 카테고리 시트 동기화 (필터_Campaign 기반)
    for (const [sheetName, categories] of Object.entries(CATEGORY_SHEET_MAP)) {
      if (categories.length === 0) continue

      const reports = await getFilteredCampaignReports(categories)
      const rows = reports.flatMap((report) =>
        report.months.map((month, i) => ({
          sheet_name: sheetName,
          group_key: report.category,       // 국가 (UK/DE/...)
          sub_category: report.subCategory, // 제품카테고리 (전략폰/애플/...)
          month,
          impressions: report.campaign.impressions[i] ?? null,
          clicks: report.campaign.clicks[i] ?? null,
          ctr: report.campaign.ctr[i] ?? null,
          spend: report.campaign.spend[i] ?? null,
          acos: report.campaign.acos[i] ?? null,
          cvr: report.campaign.cvr[i] ?? null,
          orders: report.campaign.orders[i] ?? null,
          sales: report.campaign.sales[i] ?? null,
          promoted_sales: null,
          halo_sales: null,
          synced_at: syncedAt,
        }))
      )

      if (rows.length === 0) continue

      // 기존 데이터 삭제 후 재삽입 (카테고리 구조 변경 대응)
      await supabase
        .from('report_metrics')
        .delete()
        .eq('sheet_name', sheetName)

      const { error } = await supabase
        .from('report_metrics')
        .upsert(rows, { onConflict: 'sheet_name,group_key,sub_category,month' })

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
