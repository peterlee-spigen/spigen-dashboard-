export const dynamic = 'force-dynamic'

import {
  getReportByCountryFromDB,
  getReportByCategoryFromDB,
  getLastSync,
} from '@/lib/supabase-reports'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const [national, mpc, cp, sda, auto, power, lastSync] = await Promise.all([
    getReportByCountryFromDB(),
    getReportByCategoryFromDB('MPC'),
    getReportByCategoryFromDB('CP'),
    getReportByCategoryFromDB('SDA'),
    getReportByCategoryFromDB('Auto'),
    getReportByCategoryFromDB('Power'),
    getLastSync(),
  ])

  return (
    <ReportsClient
      allData={{ national, mpc, cp, sda, auto, power }}
      fetchedAt={new Date().toISOString()}
      lastSync={lastSync}
    />
  )
}
