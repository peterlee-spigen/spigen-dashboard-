import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSheetData } from "@/lib/google-sheets";

export const runtime = "nodejs";

// 필터_Campaign 시트에서 개별 캠페인 성과를 읽어 반환
// col[0]=캠페인명, col[1]=소카테고리, col[3]=월(YY-MM), col[4]=국가
// col[7]=spend, col[9]=sales, col[6]=clicks, col[8]=orders
async function fetchCampaignDetails(
  country: string,
  subCategory: string | null,
  recentMonths: string[]   // 최근 1~2개월
): Promise<string> {
  try {
    const raw = await getSheetData("필터_Campaign!A1:N20000");
    const header = raw[1] ?? [];  // row 1 = 헤더
    void header;

    // 필터_Campaign 시트 컬럼:
    // [0]=팀, [1]=카테고리(소카테고리), [2]=마케팅코드(캠페인ID), [3]=기간(YY-MM)
    // [4]=국가, [5]=Impressions, [6]=Clicks, [7]=Total cost, [8]=Purchases, [9]=Sales
    const monthSet = new Set(recentMonths.slice(-2)); // 최근 2개월

    type CampAgg = { spend: number; sales: number; clicks: number; orders: number };
    const map = new Map<string, CampAgg>();

    for (const row of raw.slice(2)) {
      const name    = (row[2] ?? "").trim(); // 마케팅코드 (캠페인 식별자)
      const subCat  = (row[1] ?? "").trim(); // 카테고리
      const month   = (row[3] ?? "").trim(); // 기간 (YY-MM)
      const ctry    = (row[4] ?? "").trim(); // 국가

      if (!name || !monthSet.has(month)) continue;
      if (ctry.toUpperCase() !== country.toUpperCase()) continue;
      if (subCategory && subCat !== subCategory) continue;

      const spend  = parseFloat(String(row[7] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      const sales  = parseFloat(String(row[9] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      const clicks = parseFloat(String(row[6] ?? "0").replace(/[^0-9.-]/g, "")) || 0;
      const orders = parseFloat(String(row[8] ?? "0").replace(/[^0-9.-]/g, "")) || 0;

      const cur = map.get(name) ?? { spend: 0, sales: 0, clicks: 0, orders: 0 };
      cur.spend  += spend;
      cur.sales  += sales;
      cur.clicks += clicks;
      cur.orders += orders;
      map.set(name, cur);
    }

    if (map.size === 0) return "";

    // spend 기준 정렬, 상위 20개
    const sorted = [...map.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 20);

    const lines = sorted.map(([name, v]) => {
      const acos = v.sales > 0 ? `${((v.spend / v.sales) * 100).toFixed(0)}%` : "—";
      const cvr  = v.clicks > 0 ? `${((v.orders / v.clicks) * 100).toFixed(1)}%` : "—";
      return `- ${name} | 광고비=€${v.spend.toFixed(0)}, 매출=€${v.sales.toFixed(0)}, ACOS=${acos}, CVR=${cvr}, 클릭=${v.clicks.toFixed(0)}`;
    });

    return lines.join("\n");
  } catch (e) {
    console.error("[fetchCampaignDetails] error:", e);
    return "";
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tab, key, country, subCategory, months, campaign } = body as {
    tab: string;
    key: string;
    country: string;
    subCategory: string | null;
    months: string[];
    campaign: {
      sales: (number | string | null)[];
      spend: (number | string | null)[];
      acos: (string | null)[];
      ctr: (string | null)[];
      impressions: (number | string | null)[];
      clicks: (number | string | null)[];
      orders: (number | string | null)[];
    };
  };

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  // 월별 집계 요약 테이블
  const rows = months
    .map((m, i) => {
      const sales  = campaign.sales[i]  ?? "—";
      const spend  = campaign.spend[i]  ?? "—";
      const acos   = campaign.acos[i]   ?? "—";
      const ctr    = campaign.ctr[i]    ?? "—";
      const orders = campaign.orders[i] ?? "—";
      return `${m}: 매출=${sales}, 광고비=${spend}, ACOS=${acos}, CTR=${ctr}, 주문=${orders}`;
    })
    .join("\n");

  // 개별 캠페인 데이터 (MPC 등 subCategory가 있는 경우)
  const campDetail = country
    ? await fetchCampaignDetails(country, subCategory ?? null, months)
    : "";

  const campSection = campDetail
    ? `\n\n[개별 캠페인 데이터 — 최근 2개월 합산, spend 상위 20개]\n${campDetail}`
    : "";

  const prompt = `Amazon 광고 성과 분석 전문가로서 아래 데이터를 분석하세요.
Spigen DE 스토어 / ${tab} / ${key}

[월별 집계]
${rows}${campSection}

아래 형식을 정확히 따라 한국어 간결체로 작성하세요. 각 항목은 번호 + 짧은 문장(1~2줄)만 사용하세요.

## 📊 주요 지표 요약
1. 매출: (한 줄 요약)
2. 광고비: (한 줄 요약)
3. ACOS: (한 줄 요약)

## 🔍 주목할 변화
1. (변화 1 — 수치 포함, 한 줄)
2. (변화 2 — 수치 포함, 한 줄)
3. (변화 3 — 수치 포함, 한 줄)

## ✅ 즉시 실행 권고
1. (구체적 액션, 한 줄)
2. (구체적 액션, 한 줄)
3. (구체적 액션, 한 줄)
${campSection ? `
## 🎯 개별 검토 필요 캠페인
(위 캠페인 데이터 기준, ACOS 높음·CVR 낮음·비용 대비 매출 부진 캠페인을 최대 5개 선정)
1. 캠페인명 | 이유 (한 줄)
2. 캠페인명 | 이유 (한 줄)
3. 캠페인명 | 이유 (한 줄)` : ""}

규칙: 서론/인사 없이 바로 시작, 각 항목은 반드시 한 줄, 수식어 최소화.`;

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
