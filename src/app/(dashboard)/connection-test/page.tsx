"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = "pending" | "ok" | "fail" | "warn";

interface Check {
  name: string;
  status: Status;
  detail: string;
  fix?: string;
}

const TABLES = [
  "ad_campaigns",
  "attribution",
  "orders",
  "listing",
  "inventory",
  "traffic",
] as const;

function Badge({ status }: { status: Status }) {
  const cls: Record<Status, string> = {
    pending: "bg-neutral-100 text-neutral-500",
    ok:      "bg-green-100 text-green-700",
    fail:    "bg-red-100 text-red-700",
    warn:    "bg-yellow-100 text-yellow-700",
  };
  const label: Record<Status, string> = {
    pending: "대기",
    ok:      "정상",
    fail:    "실패",
    warn:    "경고",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls[status]}`}>
      {label[status]}
    </span>
  );
}

export default function ConnectionTestPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    runChecks().then((results) => {
      setChecks(results);
      setRunning(false);
    });
  }, []);

  const allOk = checks.length > 0 && checks.every((c) => c.status === "ok" || c.status === "warn");
  const anyFail = checks.some((c) => c.status === "fail");

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Supabase 연결 테스트</h1>
        <p className="text-sm text-neutral-500 mt-1">
          프로젝트: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-xs">ifklxnhcyybmfeuxgmau.supabase.co</code>
        </p>
      </div>

      {running && (
        <p className="text-sm text-neutral-400 animate-pulse">테스트 실행 중...</p>
      )}

      {!running && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          allOk
            ? "bg-green-50 border-green-200 text-green-700"
            : anyFail
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-yellow-50 border-yellow-200 text-yellow-700"
        }`}>
          {allOk
            ? "✅ 모든 테스트 통과 — Supabase가 정상적으로 연결되어 있습니다."
            : anyFail
            ? "❌ 일부 테스트 실패 — 아래 항목을 확인하세요."
            : "⚠️ 경고 항목이 있습니다."}
        </div>
      )}

      <div className="space-y-3">
        {checks.map((c, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-1"
          >
            <div className="flex items-center gap-3">
              <Badge status={c.status} />
              <span className="font-medium text-sm text-neutral-800 dark:text-neutral-100">{c.name}</span>
            </div>
            <p className="text-sm text-neutral-500 pl-1">{c.detail}</p>
            {c.fix && (
              <p className="text-xs text-red-500 pl-1 mt-1">
                <span className="font-semibold">해결 방법:</span> {c.fix}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

async function runChecks(): Promise<Check[]> {
  const results: Check[] = [];

  // 1. 환경변수 확인
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  results.push({
    name: "환경변수: NEXT_PUBLIC_SUPABASE_URL",
    status: url ? "ok" : "fail",
    detail: url ? `설정됨 → ${url}` : "값이 없습니다.",
    fix: url
      ? undefined
      : ".env.local 파일에 NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co 를 추가하세요.",
  });

  results.push({
    name: "환경변수: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    status: key ? "ok" : "fail",
    detail: key ? `설정됨 → ${key.slice(0, 20)}…` : "값이 없습니다.",
    fix: key
      ? undefined
      : ".env.local 파일에 NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key> 를 추가하세요.",
  });

  if (!url || !key) {
    results.push({
      name: "이후 테스트 건너뜀",
      status: "fail",
      detail: "환경변수가 없으면 클라이언트를 생성할 수 없습니다.",
    });
    return results;
  }

  // 2. 네트워크 ping — REST /health 엔드포인트
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    });
    // 401 is expected on the root endpoint with anon key — it just means auth is enforced (normal)
    // 5xx = server error, anything else unexpected = warn
    const restOk = res.status < 500;
    results.push({
      name: "Supabase REST 엔드포인트 응답",
      status: restOk ? "ok" : "fail",
      detail: res.status === 401
        ? `HTTP 401 — 정상 (루트 엔드포인트는 anon 키로 401 반환이 정상입니다)`
        : `HTTP ${res.status} ${res.statusText}`,
      fix: restOk
        ? undefined
        : "Supabase 서버 오류(5xx)입니다. 프로젝트가 일시 중지(paused)되었거나 장애 상태일 수 있습니다.",
    });
  } catch (e) {
    results.push({
      name: "Supabase REST 엔드포인트 응답",
      status: "fail",
      detail: `네트워크 오류: ${(e as Error).message}`,
      fix: "인터넷 연결 또는 NEXT_PUBLIC_SUPABASE_URL 값을 확인하세요.",
    });
    return results;
  }

  // 3. 각 테이블 SELECT (행 수 확인)
  for (const table of TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error) {
      const isRls = error.code === "42501" || error.message.includes("policy");
      results.push({
        name: `테이블: ${table}`,
        status: "fail",
        detail: `오류 [${error.code}]: ${error.message}`,
        fix: isRls
          ? `RLS 정책이 없거나 anon 역할에 SELECT 권한이 없습니다. Supabase > Authentication > Policies 에서 "${table}" 테이블에 anon SELECT 정책을 추가하세요.`
          : `테이블이 존재하지 않을 수 있습니다. supabase/schema.sql 을 적용했는지 확인하세요.`,
      });
    } else {
      results.push({
        name: `테이블: ${table}`,
        status: count === 0 ? "warn" : "ok",
        detail:
          count === 0
            ? "테이블은 존재하지만 행이 0개입니다. 아직 데이터를 업로드하지 않았을 수 있습니다."
            : `${count?.toLocaleString("ko-KR")}행 조회 성공`,
      });
    }
  }

  return results;
}
