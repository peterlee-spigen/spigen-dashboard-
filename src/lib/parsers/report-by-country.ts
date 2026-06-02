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

function parseNum(s: string | undefined): number | null {
  if (!s) return null
  const cleaned = s.replace(/[£€$,\s]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function findMetricRow(
  rows: string[][],
  startRow: number,
  endRow: number,
  label: string
): string[] | null {
  for (let i = startRow; i < endRow && i < rows.length; i++) {
    const row = rows[i]
    if (row && row[3] && row[3].trim().toLowerCase() === label.trim().toLowerCase()) {
      return row
    }
  }
  return null
}

function extractValues(row: string[] | null, monthCount: number): (number | null)[] {
  if (!row) return Array(monthCount).fill(null)
  // values start at col index 4
  return Array.from({ length: monthCount }, (_, i) => parseNum(row[4 + i]))
}

function extractStrings(row: string[] | null, monthCount: number): (string | null)[] {
  if (!row) return Array(monthCount).fill(null)
  return Array.from({ length: monthCount }, (_, i) => row[4 + i] ?? null)
}

export async function getReportByCountry(): Promise<CountryReport[]> {
  // Fetch enough rows to cover all 5 countries × ~25 rows each + header
  const raw = await getSheetData('Report(국가별)!A1:Z130')

  // Find all header rows (rows where col[1]==="Source")
  const headerRowIndices: number[] = []
  raw.forEach((row, i) => {
    if (row[1] === 'Source') headerRowIndices.push(i)
  })

  const results: CountryReport[] = []

  for (let h = 0; h < headerRowIndices.length; h++) {
    const headerIdx = headerRowIndices[h]
    const nextHeaderIdx = headerRowIndices[h + 1] ?? raw.length
    const headerRow = raw[headerIdx]

    const country = headerRow[3] ?? ''
    // Months start at col index 4 (E)
    const months: string[] = []
    for (let c = 4; c < headerRow.length; c++) {
      const v = headerRow[c]
      if (v && v.match(/^\d{2}-\d{2}$/)) months.push(v)
    }

    const block = raw.slice(headerIdx + 1, nextHeaderIdx)

    const findRow = (label: string) =>
      block.find((r) => r[3]?.trim().toLowerCase() === label.toLowerCase()) ?? null

    // Campaign rows
    const impRow = findRow('Impressions') ?? findRow('Ad Impressions')
    const clickRow = findRow('Clicks') ?? findRow('Ad Clicks')
    const ctrRow = findRow('CTR') ?? findRow('Ad CTR')
    const spendRow = findRow('Spend')
    const acosRow = findRow('ACOS')
    const cvrRow = findRow('CVR') ?? findRow('Ad CVR')
    const ordersRow = findRow('Orders') ?? findRow('Ad Orders')
    const salesRow = findRow('Sales') ?? findRow('Ad Sales')

    // Ad Sales rows
    const promotedRow = findRow('Promoted Sales') ?? findRow('Promoted Ad Sales')
    const haloRow = findRow('Halo Sales') ?? findRow('Halo Ad Sales')

    const n = months.length

    results.push({
      country,
      months,
      campaign: {
        impressions: extractValues(impRow, n),
        clicks: extractValues(clickRow, n),
        ctr: extractStrings(ctrRow, n),
        spend: extractValues(spendRow, n),
        acos: extractStrings(acosRow, n),
        cvr: extractStrings(cvrRow, n),
        orders: extractValues(ordersRow, n),
        sales: extractValues(salesRow, n),
      },
      adSales: {
        promotedSales: extractValues(promotedRow, n),
        haloSales: extractValues(haloRow, n),
      },
    })
  }

  return results
}
