import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tab, key, months, campaign } = body as {
    tab: string;
    key: string;
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

  const rows = months
    .map((m, i) => {
      const sales = campaign.sales[i] ?? "—";
      const spend = campaign.spend[i] ?? "—";
      const acos = campaign.acos[i] ?? "—";
      const ctr = campaign.ctr[i] ?? "—";
      const orders = campaign.orders[i] ?? "—";
      return `${m}: 매출=${sales}, 광고비=${spend}, ACOS=${acos}, CTR=${ctr}, 주문=${orders}`;
    })
    .join("\n");

  const prompt = `Amazon 광고 성과 분석 전문가로서 아래 데이터를 분석하세요.
Spigen DE 스토어 / ${tab} / ${key}

${rows}

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
