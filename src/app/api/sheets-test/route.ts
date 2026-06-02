import { getSheetData, getSheetMeta } from '@/lib/google-sheets'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const range = req.nextUrl.searchParams.get('range')
  if (range) {
    const data = await getSheetData(range)
    return NextResponse.json({ range, data })
  }
  const meta = await getSheetMeta()
  return NextResponse.json({ sheets: meta })
}
