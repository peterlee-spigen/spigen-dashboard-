#!/bin/bash
set -e

# ── 설정 (배포 전 수정하세요) ────────────────────────────────
PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast3"          # 서울 리전
FUNCTION_NAME="gcf-chat-summary"
SCHEDULE="0 9 * * 1-5"            # 평일 오전 9시 KST
SCHEDULER_TIMEZONE="Asia/Seoul"
# ──────────────────────────────────────────────────────────────

FUNCTION_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${FUNCTION_NAME}"

echo "🚀 Cloud Function 배포 중..."
gcloud functions deploy ${FUNCTION_NAME} \
  --gen2 \
  --runtime=nodejs20 \
  --region=${REGION} \
  --source=. \
  --entry-point=chatSummary \
  --trigger=http \
  --allow-unauthenticated \
  --memory=256Mi \
  --timeout=120s \
  --set-env-vars="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY},GOOGLE_CHAT_SPACE_IDS=${GOOGLE_CHAT_SPACE_IDS},GOOGLE_CHAT_WEBHOOK_URL=${GOOGLE_CHAT_WEBHOOK_URL}" \
  --set-env-vars="GOOGLE_SERVICE_ACCOUNT_JSON=${GOOGLE_SERVICE_ACCOUNT_JSON}" \
  --project=${PROJECT_ID}

echo ""
echo "⏰ Cloud Scheduler 등록 중..."
gcloud scheduler jobs create http ${FUNCTION_NAME}-scheduler \
  --schedule="${SCHEDULE}" \
  --uri="${FUNCTION_URL}" \
  --http-method=POST \
  --time-zone="${SCHEDULER_TIMEZONE}" \
  --location=${REGION} \
  --project=${PROJECT_ID} \
  2>/dev/null || \
gcloud scheduler jobs update http ${FUNCTION_NAME}-scheduler \
  --schedule="${SCHEDULE}" \
  --uri="${FUNCTION_URL}" \
  --http-method=POST \
  --time-zone="${SCHEDULER_TIMEZONE}" \
  --location=${REGION} \
  --project=${PROJECT_ID}

echo ""
echo "✅ 완료!"
echo "   Function URL : ${FUNCTION_URL}"
echo "   Schedule     : ${SCHEDULE} (${SCHEDULER_TIMEZONE})"
echo ""
echo "수동 테스트:"
echo "  curl -X POST ${FUNCTION_URL}"
