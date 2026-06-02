import { getSheetData } from '@/lib/google-sheets'

export type CountryReport = {
  country: string
  months: string[]
  campaign: {
    impressions: (number | null)[]
    clicks: (number | null)[]
    ctr: (string | null)[]
    spend: (number | null)[]
    acos: (string | null)[]
    cvr: (string | null)[]
    orders: (number | null)[]
    sales: (number | null)[]
  }
  adSales: {
    promotedSales: (number | null)[]
    haloSales: (number | null)[]
  }
}

export type CategoryReport = {
  category: string
  months: string[]
  campaign: {
    impressions: (number | null)[]
    clicks: (number | null)[]
    ctr: (string | null)[]
    spend: (number | null)[]
    acos: (string | null)[]
    cvr: (string | null)[]
    orders: (number | null)[]
    sales: (number | null)[]
  }
  adSales: {
    promotedSales: (number | null)[]
    haloSales: (number | null)[]
  }
}

function parseNum(s: string | undefined): number | null {
  if (!s) return null
  const cleaned = s.replace(/[£€$,\s]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function extractValues(row: string[] | null, monthCount: number): (number | null)[] {
  if (!row) return Array(monthCount).fill(null)
  return Array.from({ length: monthCount }, (_, i) => parseNum(row[4 + i]))
}

function extractStrings(row: string[] | null, monthCount: number): (string | null)[] {
  if (!row) return Array(monthCount).fill(null)
  return Array.from({ length: monthCount }, (_, i) => row[4 + i] ?? null)
}

// 공통 파싱 함수: Source 헤더 기준으로 블록을 나눠 지표 추출
// col[3]의 값이 국가코드(UK/DE...)이거나 카테고리명(MPC/CP...)인 점만 다름
export function parseReportBlocks(raw: string[][]): Array<{
  key: string
  months: string[]
  campaign: CountryReport['campaign']
  adSales: CountryReport['adSales']
}> {
  const headerRowIndices: number[] = []
  raw.forEach((row, i) => {
    if (row[1] === 'Source') headerRowIndices.push(i)
  })

  return headerRowIndices.map((headerIdx, h) => {
    const nextHeaderIdx = headerRowIndices[h + 1] ?? raw.length
    const headerRow = raw[headerIdx]

    const key = headerRow[3] ?? ''
    const months: string[] = []
    for (let c = 4; c < headerRow.length; c++) {
      const v = headerRow[c]
      if (v && /^\d{2}-\d{2}$/.test(v)) months.push(v)
    }

    const block = raw.slice(headerIdx + 1, nextHeaderIdx)
    const findRow = (label: string) =>
      block.find((r) => r[3]?.trim().toLowerCase() === label.toLowerCase()) ?? null

    const n = months.length

    return {
      key,
      months,
      campaign: {
        impressions: extractValues(findRow('Impressions') ?? findRow('Ad Impressions'), n),
        clicks: extractValues(findRow('Clicks') ?? findRow('Ad Clicks'), n),
        ctr: extractStrings(findRow('CTR') ?? findRow('Ad CTR'), n),
        spend: extractValues(findRow('Spend'), n),
        acos: extractStrings(findRow('ACOS'), n),
        cvr: extractStrings(findRow('CVR') ?? findRow('Ad CVR'), n),
        orders: extractValues(findRow('Orders') ?? findRow('Ad Orders'), n),
        sales: extractValues(findRow('Sales') ?? findRow('Ad Sales'), n),
      },
      adSales: {
        promotedSales: extractValues(
          findRow('Promoted Sales') ?? findRow('Promoted Ad Sales'), n
        ),
        haloSales: extractValues(
          findRow('Halo Sales') ?? findRow('Halo Ad Sales'), n
        ),
      },
    }
  })
}

export async function getReportByCountry(): Promise<CountryReport[]> {
  const raw = await getSheetData('Report(국가별)!A1:Z130')
  return parseReportBlocks(raw).map(({ key, ...rest }) => ({
    country: key,
    ...rest,
  }))
}

export async function getReportByCategory(
  sheetName: string
): Promise<CategoryReport[]> {
  const raw = await getSheetData(`${sheetName}!A1:Z130`)
  return parseReportBlocks(raw).map(({ key, ...rest }) => ({
    category: key,
    ...rest,
  }))
}
