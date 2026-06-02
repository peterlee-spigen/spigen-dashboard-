import {
  getReportByCountry,
  getReportByCategory,
} from '@/lib/parsers/report-by-country'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CATEGORY_TABS: Record<string, string> = {
  mpc: 'Report(MPC)',
  cp: 'Report(CP)',
  sda: 'Report(SDA)',
  auto: 'Report(Auto)',
  power: 'Report(Power)',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tab: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tab } = await params

  if (tab === 'national') {
    const data = await getReportByCountry()
    return NextResponse.json(data)
  }

  const sheetName = CATEGORY_TABS[tab]
  if (!sheetName) {
    return NextResponse.json(
      { error: `Unknown tab: ${tab}. Valid: national, mpc, cp, sda, auto, power` },
      { status: 400 }
    )
  }

  const data = await getReportByCategory(sheetName)
  return NextResponse.json(data)
}
