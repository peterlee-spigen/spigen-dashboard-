import { getSheetData } from '@/lib/google-sheets'
import type { CategoryReport } from './report-by-country'

function parseNum(s: string | undefined): number {
  if (!s) return 0
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? 0 : n
}

// 필터_Campaign 시트에서 카테고리별 집계 데이터를 읽어 CategoryReport[] 반환
// category = 국가(UK/DE/...), subCategory = 제품카테고리(전략폰/애플/삼성A/...)
export async function getFilteredCampaignReports(
  sheetCategories: string[] // 포함할 카테고리 목록 (빈 배열이면 전체)
): Promise<CategoryReport[]> {
  const raw = await getSheetData('필터_Campaign!A1:N20000')
  // Row 0: 합계 행, Row 1: 헤더, Row 2+: 데이터
  const dataRows = raw.slice(2).filter(r => r[1] && r[3] && r[4])

  const filtered =
    sheetCategories.length > 0
      ? dataRows.filter(r => sheetCategories.includes(r[1]))
      : dataRows

  type AggData = {
    impressions: number
    clicks: number
    spend: number
    orders: number
    sales: number
  }
  const groups = new Map<string, AggData>()

  for (const row of filtered) {
    const subCat = row[1]
    const month = row[3]
    const country = row[4]
    const key = `${country}||${subCat}||${month}`

    const existing = groups.get(key) ?? {
      impressions: 0,
      clicks: 0,
      spend: 0,
      orders: 0,
      sales: 0,
    }
    existing.impressions += parseNum(row[5])
    existing.clicks += parseNum(row[6])
    existing.spend += parseNum(row[7])
    existing.orders += parseNum(row[8])
    existing.sales += parseNum(row[9])
    groups.set(key, existing)
  }

  // (country, subCategory) 단위로 월별 데이터 수집
  const reportMap = new Map<
    string,
    { category: string; subCategory: string; monthData: Map<string, AggData> }
  >()

  for (const [key, data] of groups) {
    const [country, subCat, month] = key.split('||')
    const reportKey = `${country}||${subCat}`

    if (!reportMap.has(reportKey)) {
      reportMap.set(reportKey, {
        category: country,
        subCategory: subCat,
        monthData: new Map(),
      })
    }
    reportMap.get(reportKey)!.monthData.set(month, data)
  }

  const result: CategoryReport[] = []

  for (const { category, subCategory, monthData } of reportMap.values()) {
    const months = [...monthData.keys()].sort()

    const impressions = months.map(m => monthData.get(m)!.impressions)
    const clicks = months.map(m => monthData.get(m)!.clicks)
    const spend = months.map(m => monthData.get(m)!.spend)
    const orders = months.map(m => monthData.get(m)!.orders)
    const sales = months.map(m => monthData.get(m)!.sales)

    const ctr = months.map((_, i) => {
      const imp = impressions[i]
      if (!imp) return null
      return `${((clicks[i] / imp) * 100).toFixed(2)}%`
    })
    const acos = months.map((_, i) => {
      const sa = sales[i]
      if (!sa) return null
      return `${((spend[i] / sa) * 100).toFixed(0)}%`
    })
    const cvr = months.map((_, i) => {
      const cl = clicks[i]
      if (!cl) return null
      return `${((orders[i] / cl) * 100).toFixed(1)}%`
    })

    result.push({
      category,
      subCategory,
      months,
      campaign: {
        impressions,
        clicks,
        ctr,
        spend,
        acos,
        cvr,
        orders,
        sales,
      },
      adSales: {
        promotedSales: Array(months.length).fill(null),
        haloSales: Array(months.length).fill(null),
      },
    })
  }

  return result
}
