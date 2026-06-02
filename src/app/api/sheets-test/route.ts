import { getSheetMeta } from '@/lib/google-sheets'
import { NextResponse } from 'next/server'

export async function GET() {
  const meta = await getSheetMeta()
  return NextResponse.json({ sheets: meta })
}
