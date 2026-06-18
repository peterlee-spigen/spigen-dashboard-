const { google } = require("googleapis");
const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 요약할 Google Chat 스페이스 목록 (환경변수로 관리)
// 형식: "spaces/XXXX,spaces/YYYY"
const SPACE_IDS = (process.env.GOOGLE_CHAT_SPACE_IDS || "").split(",").filter(Boolean);

// 요약 결과를 전송할 구글챗 웹훅 URL
const WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL;

async function getAuthClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/chat.messages.readonly"],
  });
  return auth.getClient();
}

async function fetchTodayMessages(chatClient, spaceName) {
  // 오늘 자정 KST(UTC+9)를 UTC로 변환
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const kstMidnight = new Date(kstNow);
  kstMidnight.setHours(0, 0, 0, 0);
  const utcMidnight = new Date(kstMidnight.getTime() - kstOffset);

  const filter = `createTime >= "${utcMidnight.toISOString()}"`;

  const messages = [];
  let pageToken;

  do {
    const res = await chatClient.spaces.messages.list({
      parent: spaceName,
      filter,
      pageSize: 100,
      pageToken,
    });

    const batch = res.data.messages || [];
    messages.push(...batch);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return messages;
}

function formatMessages(messages) {
  if (!messages.length) return null;

  return messages
    .map((m) => {
      const sender = m.sender?.displayName || "알 수 없음";
      const time = new Date(m.createTime).toLocaleTimeString("ko-KR", {
        timeZone: "Asia/Seoul",
        hour: "2-digit",
        minute: "2-digit",
      });
      const text = m.text || "(첨부파일/카드 메시지)";
      return `[${time}] ${sender}: ${text}`;
    })
    .join("\n");
}

async function summarizeWithClaude(spaceName, formattedMessages) {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const prompt = `다음은 ${today} 구글챗 채널(${spaceName})의 대화 내용입니다.

${formattedMessages}

위 대화를 다음 형식으로 한국어로 요약해주세요:
1. **주요 논의 사항** (3~5개 불릿)
2. **결정된 사항** (있다면)
3. **후속 조치 필요 항목** (있다면)

간결하고 실무적으로 요약해주세요.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].text;
}

async function sendToWebhook(summaryText) {
  const today = new Date().toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  const payload = {
    text: `*📋 ${today} 구글챗 일일 요약*\n\n${summaryText}`,
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Webhook 전송 실패: ${res.status} ${await res.text()}`);
  }
}

// Cloud Functions 진입점
exports.chatSummary = async (req, res) => {
  try {
    if (!WEBHOOK_URL) throw new Error("GOOGLE_CHAT_WEBHOOK_URL 환경변수가 없습니다.");
    if (!SPACE_IDS.length) throw new Error("GOOGLE_CHAT_SPACE_IDS 환경변수가 없습니다.");
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY 환경변수가 없습니다.");

    const authClient = await getAuthClient();
    const chatClient = google.chat({ version: "v1", auth: authClient });

    const summaryParts = [];

    for (const spaceId of SPACE_IDS) {
      const spaceName = spaceId.trim();
      console.log(`[${spaceName}] 메시지 수집 중...`);

      let messages;
      try {
        messages = await fetchTodayMessages(chatClient, spaceName);
      } catch (err) {
        console.error(`[${spaceName}] 메시지 수집 실패:`, err.message);
        summaryParts.push(`*${spaceName}*\n⚠️ 메시지 수집 실패: ${err.message}`);
        continue;
      }

      if (!messages.length) {
        console.log(`[${spaceName}] 오늘 메시지 없음`);
        continue;
      }

      console.log(`[${spaceName}] ${messages.length}개 메시지 요약 중...`);
      const formatted = formatMessages(messages);
      const summary = await summarizeWithClaude(spaceName, formatted);
      summaryParts.push(`*${spaceName}*\n${summary}`);
    }

    if (!summaryParts.length) {
      await sendToWebhook("오늘 수집된 메시지가 없습니다.");
    } else {
      await sendToWebhook(summaryParts.join("\n\n---\n\n"));
    }

    console.log("요약 전송 완료");
    res.status(200).json({ status: "ok", spaces: SPACE_IDS.length });
  } catch (err) {
    console.error("오류:", err);
    res.status(500).json({ error: err.message });
  }
};
