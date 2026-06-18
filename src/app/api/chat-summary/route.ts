import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 120;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function getAuthClient() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/chat.messages.readonly"],
  });
}

async function fetchTodayMessages(chatClient: ReturnType<typeof google.chat>, spaceName: string) {
  // 오늘 KST 자정을 UTC로 변환
  const kstOffset = 9 * 60 * 60 * 1000;
  const now = new Date();
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstMidnight = new Date(kstNow);
  kstMidnight.setHours(0, 0, 0, 0);
  const utcMidnight = new Date(kstMidnight.getTime() - kstOffset);

  const messages: { sender: string; time: string; text: string }[] = [];
  let pageToken: string | undefined;

  do {
    const res = await chatClient.spaces.messages.list({
      parent: spaceName,
      filter: `createTime >= "${utcMidnight.toISOString()}"`,
      pageSize: 100,
      pageToken,
    });

    for (const m of res.data.messages ?? []) {
      const sender = (m.sender as { displayName?: string })?.displayName ?? "알 수 없음";
      const time = new Date(m.createTime as string).toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
      });
      const text = (m.text as string | undefined) ?? "(첨부파일/카드)";
      messages.push({ sender, time, text });
    }

    pageToken = res.data.nextPageToken as string | undefined;
  } while (pageToken);

  return messages;
}

async function summarize(spaceName: string, messages: { sender: string; time: string; text: string }[]) {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const dialog = messages.map((m) => `[${m.time}] ${m.sender}: ${m.text}`).join("\n");

  const prompt = `다음은 ${today} 구글챗 채널(${spaceName})의 대화입니다.\n\n${dialog}\n\n
아래 형식으로 한국어로 간결하게 요약해주세요:
**주요 논의 사항**
- (불릿 3~5개)

**결정된 사항**
- (없으면 "없음")

**후속 조치 필요**
- (없으면 "없음")`;

  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return result.text ?? "(요약 실패)";
}

async function sendWebhook(text: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) throw new Error("GOOGLE_CHAT_WEBHOOK_URL 환경변수가 없습니다.");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`웹훅 전송 실패: ${res.status}`);
}

export async function POST(req: NextRequest) {
  // Vercel Cron 또는 수동 호출 모두 허용 (SYNC_SECRET으로 보호)
  const secret = process.env.SYNC_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const spaceIds = (process.env.GOOGLE_CHAT_SPACE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!spaceIds.length) {
    return NextResponse.json({ error: "GOOGLE_CHAT_SPACE_IDS 환경변수가 없습니다." }, { status: 500 });
  }

  const authClient = getAuthClient();
  const chatClient = google.chat({ version: "v1", auth: authClient });

  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const summaryParts: string[] = [`*📋 ${today} 구글챗 일일 요약*\n`];
  const results: Record<string, number> = {};

  for (const spaceId of spaceIds) {
    try {
      const messages = await fetchTodayMessages(chatClient, spaceId);
      results[spaceId] = messages.length;

      if (!messages.length) {
        console.log(`[${spaceId}] 오늘 메시지 없음`);
        continue;
      }

      console.log(`[${spaceId}] ${messages.length}개 요약 중...`);
      const summary = await summarize(spaceId, messages);
      summaryParts.push(`*채널: ${spaceId}*\n${summary}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${spaceId}] 오류:`, msg);
      summaryParts.push(`*채널: ${spaceId}*\n⚠️ 처리 실패: ${msg}`);
    }
  }

  if (summaryParts.length === 1) {
    summaryParts.push("오늘 수집된 메시지가 없습니다.");
  }

  await sendWebhook(summaryParts.join("\n\n---\n\n"));

  return NextResponse.json({ ok: true, results });
}
