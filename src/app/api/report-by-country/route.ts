import { getReportByCountry } from '@/lib/parsers/report-by-country'
import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1시간 캐시

export async function GET() {
  const data = await getReportByCountry()
  return NextResponse.json(data)
}
