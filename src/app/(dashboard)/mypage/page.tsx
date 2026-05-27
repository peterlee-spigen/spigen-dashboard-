"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage({ type: "error", text: "비밀번호는 최소 6자 이상이어야 합니다." });
      return;
    }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwMessage({ type: "error", text: error.message });
    } else {
      setPwMessage({ type: "success", text: "비밀번호가 성공적으로 변경됐습니다." });
      setNewPassword("");
      setConfirmPassword("");
    }
    setPwLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const provider = user?.app_metadata?.provider ?? "email";
  const isPasswordUser = provider === "email";

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
        마이페이지
      </h1>

      {/* 계정 정보 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          계정 정보
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold uppercase shrink-0">
              {user?.email?.[0] ?? "?"}
            </span>
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {user?.email ?? "-"}
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {provider === "email" ? "이메일 계정" : `소셜 로그인 (${provider})`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
              <p className="text-xs text-neutral-400">가입일</p>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 mt-0.5">
                {formatDate(user?.created_at)}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2">
              <p className="text-xs text-neutral-400">마지막 로그인</p>
              <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200 mt-0.5">
                {formatDate(user?.last_sign_in_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          비밀번호 변경
        </h2>
        {!isPasswordUser ? (
          <p className="text-xs text-neutral-400">
            소셜 로그인 계정은 비밀번호를 별도로 설정할 수 있습니다.
          </p>
        ) : null}
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              새 비밀번호
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="최소 6자"
              minLength={6}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호 재입력"
              minLength={6}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {pwMessage && (
            <div
              className={`px-3 py-2 rounded-lg text-xs ${
                pwMessage.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              }`}
            >
              {pwMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-2 rounded-lg transition-colors"
          >
            {pwLoading ? "변경 중..." : "비밀번호 변경"}
          </button>
        </form>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
          세션
        </h2>
        <button
          onClick={handleLogout}
          className="w-full border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium text-sm py-2 rounded-lg transition-colors"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
