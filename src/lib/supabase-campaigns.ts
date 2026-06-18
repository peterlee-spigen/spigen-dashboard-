import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) } }
)

export type CampaignType = 'sp' | 'sb' | 'sd'

export interface SpRow {
  id: number
  date: string
  campaign_id: string
  campaign_name: string | null
  campaign_status: string | null
  campaign_budget_amount: number | null
  campaign_budget_currency: string | null
  campaign_budget_type: string | null
  campaign_bidding_strategy: string | null
  impressions: number
  clicks: number
  ctr: number
  cost: number
  cost_per_click: number
  sales_1d: number
  sales_7d: number
  sales_14d: number
  sales_30d: number
  purchases_14d: number
  units_sold_clicks_14d: number
  top_of_search_impression_share: number
}

export interface SbRow {
  id: number
  date: string
  campaign_id: string
  campaign_name: string | null
  campaign_status: string | null
  campaign_budget_amount: number | null
  campaign_budget_currency: string | null
  campaign_budget_type: string | null
  cost_type: string | null
  impressions: number
  clicks: number
  cost: number
  sales: number
  sales_clicks: number
  purchases: number
  purchases_clicks: number
  units_sold: number
  new_to_brand_purchases: number
  new_to_brand_sales: number
  new_to_brand_units_sold: number
  add_to_cart: number
  add_to_cart_clicks: number
  add_to_cart_rate: number
  viewability_rate: number
  view_ctr: number
  top_of_search_impression_share: number
  branded_searches: number
}

export interface SdRow {
  id: number
  date: string
  campaign_id: string
  campaign_name: string | null
  campaign_status: string | null
  campaign_budget_amount: number | null
  campaign_budget_currency: string | null
  cost_type: string | null
  impressions_views: number
  clicks: number
  cost: number
  sales: number
  sales_clicks: number
  purchases: number
  purchases_clicks: number
  detail_page_views: number
  detail_page_views_clicks: number
  add_to_cart: number
  add_to_cart_clicks: number
  add_to_cart_views: number
  add_to_cart_rate: number
  new_to_brand_purchases: number
  new_to_brand_sales: number
  new_to_brand_units_sold: number
  cumulative_reach: number
  viewability_rate: number
  view_ctr: number
}

export async function getSpCampaigns(from?: string, to?: string): Promise<SpRow[]> {
  let q = supabase.from('sp_campaigns').select('*').order('date', { ascending: false })
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as SpRow[]
}

export async function getSbCampaigns(from?: string, to?: string): Promise<SbRow[]> {
  let q = supabase.from('sb_campaigns').select('*').order('date', { ascending: false })
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as SbRow[]
}

export async function getSdCampaigns(from?: string, to?: string): Promise<SdRow[]> {
  let q = supabase.from('sd_campaigns').select('*').order('date', { ascending: false })
  if (from) q = q.gte('date', from)
  if (to) q = q.lte('date', to)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []) as SdRow[]
}
