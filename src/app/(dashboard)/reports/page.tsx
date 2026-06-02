import { getReportByCountry, getReportByCategory } from '@/lib/parsers/report-by-country'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  // 6탭 동시 fetch — unstable_cache(revalidate:60) 적용됨
  const [national, mpc, cp, sda, auto, power] = await Promise.all([
    getReportByCountry(),
    getReportByCategory('Report(MPC)'),
    getReportByCategory('Report(CP)'),
    getReportByCategory('Report(SDA)'),
    getReportByCategory('Report(Auto)'),
    getReportByCategory('Report(Power)'),
  ])

  return (
    <ReportsClient
      allData={{ national, mpc, cp, sda, auto, power }}
      fetchedAt={new Date().toISOString()}
    />
  )
}
