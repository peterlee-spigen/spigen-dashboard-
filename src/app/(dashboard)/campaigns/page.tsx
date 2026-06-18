export const dynamic = 'force-dynamic'

import { getSpCampaigns, getSbCampaigns, getSdCampaigns } from '@/lib/supabase-campaigns'
import CampaignsClient from './CampaignsClient'

export default async function CampaignsPage() {
  const [sp, sb, sd] = await Promise.all([
    getSpCampaigns(),
    getSbCampaigns(),
    getSdCampaigns(),
  ])

  return <CampaignsClient sp={sp} sb={sb} sd={sd} />
}
