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

  const prompt = `당신은 Amazon 광고 성과 분석 전문가입니다.
아래는 Spigen DE 스토어의 ${tab} 탭, ${key} 데이터입니다 (최신 월 순서).

${rows}

다음을 한국어로 분석해주세요:
1. **주요 지표 요약** (매출, 광고비, ACOS 추세 2~3문장)
2. **주목할 변화** (전월 대비 눈에 띄는 증감 또는 이상 징후)
3. **실행 권고사항 3가지** (구체적이고 즉시 실행 가능한 것)

마크다운 형식으로 작성하세요.`;

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
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
