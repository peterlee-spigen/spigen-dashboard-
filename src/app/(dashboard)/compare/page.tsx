export const dynamic = 'force-dynamic'

import {
  getReportByCountryFromDB,
  getReportByCategoryFromDB,
  getLastSync,
} from '@/lib/supabase-reports'
import CompareClient from './CompareClient'

export default async function ComparePage() {
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
    <CompareClient
      allData={{ national, mpc, cp, sda, auto, power }}
      lastSync={lastSync}
    />
  )
}
