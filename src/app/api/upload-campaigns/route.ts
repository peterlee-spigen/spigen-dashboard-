import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

function n(v: unknown): number {
  const num = parseFloat(String(v ?? '0').replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}
function s(v: unknown): string | null {
  const str = String(v ?? '').trim()
  return str === '' ? null : str
}
function dateStr(v: unknown): string {
  const raw = String(v ?? '').trim()
  // YYYYMMDD → YYYY-MM-DD
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return raw
}

function detectType(headers: string[]): 'sp' | 'sb' | 'sd' | null {
  const h = new Set(headers)
  if (h.has('campaignBiddingStrategy') || h.has('costPerClick')) return 'sp'
  if (h.has('topOfSearchImpressionShare') && h.has('brandedSearches') && !h.has('impressionsViews')) return 'sb'
  if (h.has('impressionsViews') || h.has('cumulativeReach')) return 'sd'
  return null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const text = await file.text()
  const { data: rows, meta } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  const type = detectType(meta.fields ?? [])
  if (!type) return NextResponse.json({ error: '캠페인 유형을 인식할 수 없습니다 (SP/SB/SD)' }, { status: 400 })

  if (type === 'sp') {
    const records = rows.map(r => ({
      date: dateStr(r.date),
      campaign_id: String(r.campaignId ?? ''),
      campaign_name: s(r.campaignName),
      campaign_status: s(r.campaignStatus),
      campaign_budget_amount: n(r.campaignBudgetAmount),
      campaign_budget_currency: s(r.campaignBudgetCurrencyCode) ?? 'EUR',
      campaign_budget_type: s(r.campaignBudgetType),
      campaign_bidding_strategy: s(r.campaignBiddingStrategy),
      impressions: n(r.impressions),
      clicks: n(r.clicks),
      ctr: n(r.clickThroughRate),
      cost: n(r.cost),
      cost_per_click: n(r.costPerClick),
      sales_1d: n(r.sales1d),
      sales_7d: n(r.sales7d),
      sales_14d: n(r.sales14d),
      sales_30d: n(r.sales30d),
      purchases_14d: n(r.purchases14d),
      units_sold_clicks_14d: n(r.unitsSoldClicks14d),
      top_of_search_impression_share: n(r.topOfSearchImpressionShare),
    }))
    const { error } = await supabase.from('sp_campaigns').upsert(records, { onConflict: 'date,campaign_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, type: 'SP', rows: records.length })
  }

  if (type === 'sb') {
    const records = rows.map(r => ({
      date: dateStr(r.date),
      campaign_id: String(r.campaignId ?? ''),
      campaign_name: s(r.campaignName),
      campaign_status: s(r.campaignStatus),
      campaign_budget_amount: n(r.campaignBudgetAmount),
      campaign_budget_currency: s(r.campaignBudgetCurrencyCode) ?? 'EUR',
      campaign_budget_type: s(r.campaignBudgetType),
      cost_type: s(r.costType),
      impressions: n(r.impressions),
      clicks: n(r.clicks),
      cost: n(r.cost),
      sales: n(r.sales),
      sales_clicks: n(r.salesClicks),
      purchases: n(r.purchases),
      purchases_clicks: n(r.purchasesClicks),
      units_sold: n(r.unitsSold),
      new_to_brand_purchases: n(r.newToBrandPurchases),
      new_to_brand_sales: n(r.newToBrandSales),
      new_to_brand_units_sold: n(r.newToBrandUnitsSold),
      add_to_cart: n(r.addToCart),
      add_to_cart_clicks: n(r.addToCartClicks),
      add_to_cart_rate: n(r.addToCartRate),
      viewability_rate: n(r.viewabilityRate),
      view_ctr: n(r.viewClickThroughRate),
      top_of_search_impression_share: n(r.topOfSearchImpressionShare),
      branded_searches: n(r.brandedSearches),
    }))
    const { error } = await supabase.from('sb_campaigns').upsert(records, { onConflict: 'date,campaign_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, type: 'SB', rows: records.length })
  }

  // sd
  const records = rows.map(r => ({
    date: dateStr(r.date),
    campaign_id: String(r.campaignId ?? ''),
    campaign_name: s(r.campaignName),
    campaign_status: s(r.campaignStatus),
    campaign_budget_amount: n(r.campaignBudgetAmount),
    campaign_budget_currency: s(r.campaignBudgetCurrencyCode) ?? 'EUR',
    cost_type: s(r.costType),
    impressions_views: n(r.impressionsViews),
    clicks: n(r.clicks),
    cost: n(r.cost),
    sales: n(r.sales),
    sales_clicks: n(r.salesClicks),
    purchases: n(r.purchases),
    purchases_clicks: n(r.purchasesClicks),
    detail_page_views: n(r.detailPageViews),
    detail_page_views_clicks: n(r.detailPageViewsClicks),
    add_to_cart: n(r.addToCart),
    add_to_cart_clicks: n(r.addToCartClicks),
    add_to_cart_views: n(r.addToCartViews),
    add_to_cart_rate: n(r.addToCartRate),
    new_to_brand_purchases: n(r.newToBrandPurchases),
    new_to_brand_sales: n(r.newToBrandSales),
    new_to_brand_units_sold: n(r.newToBrandUnitsSold),
    cumulative_reach: n(r.cumulativeReach),
    viewability_rate: n(r.viewabilityRate),
    view_ctr: n(r.viewClickThroughRate),
  }))
  const { error } = await supabase.from('sd_campaigns').upsert(records, { onConflict: 'date,campaign_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, type: 'SD', rows: records.length })
}
