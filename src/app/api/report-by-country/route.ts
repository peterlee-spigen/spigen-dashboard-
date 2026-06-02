import { getReportByCountry } from '@/lib/parsers/report-by-country'
import { NextResponse } from 'next/server'

// 캐싱은 google-sheets.ts의 unstable_cache가 담당 (revalidate: 60)
export async function GET() {
  const data = await getReportByCountry()
  return NextResponse.json(data)
}
