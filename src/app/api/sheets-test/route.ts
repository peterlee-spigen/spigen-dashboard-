import { getSheetData, getSheetMeta } from '@/lib/google-sheets'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get('range')
  if (range) {
    const data = await getSheetData(range)
    return NextResponse.json({ range, data })
  }
  const meta = await getSheetMeta()
  return NextResponse.json({ sheets: meta })
}
