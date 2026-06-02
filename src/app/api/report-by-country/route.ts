import { getReportByCountry } from '@/lib/parsers/report-by-country'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 캐싱은 google-sheets.ts의 unstable_cache가 담당 (revalidate: 60)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await getReportByCountry()
  return NextResponse.json(data)
}
