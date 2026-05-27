"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";
type LoginTab = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<LoginTab>("password");
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const supabase = createClient();

  function checkDomain(email: string): boolean {
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain !== "spigen.com") {
      setMessage({ type: "error", text: "@spigen.com 이메일 주소만 사용할 수 있습니다." });
      setLoading(false);
      return false;
    }
    return true;
  }

  async function handlePasswordAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!checkDomain(email)) return;

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: "이메일 또는 비밀번호가 올바르지 않습니다." });
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({
          type: "success",
          text: "확인 이메일이 발송됐습니다. 받은 편지함을 확인해 주세요.",
        });
      }
    }
    setLoading(false);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!checkDomain(email)) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({
        type: "success",
        text: "로그인 링크가 발송됐습니다. 이메일을 확인해 주세요.",
      });
    }
    setLoading(false);
  }

  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const callbackError = searchParams?.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <p className="text-xs text-neutral-400 uppercase tracking-widest mb-1">Spigen DE</p>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            광고 대시보드
          </h1>
          <p className="mt-2 text-sm text-neutral-500">계속하려면 로그인하세요</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 mb-6">
            <button
              onClick={() => { setTab("password"); setMessage(null); }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                tab === "password"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              이메일 + 비밀번호
            </button>
            <button
              onClick={() => { setTab("magic"); setMessage(null); }}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                tab === "magic"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              }`}
            >
              매직 링크
            </button>
          </div>

          {/* Callback error */}
          {callbackError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs">
              로그인 중 오류가 발생했습니다. 다시 시도해 주세요.
            </div>
          )}

          {/* Status message */}
          {message && (
            <div
              className={`mb-4 px-3 py-2 rounded-lg text-xs ${
                message.type === "error"
                  ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                  : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Password tab */}
          {tab === "password" && (
            <>
              {/* Mode toggle */}
              <div className="flex gap-4 mb-5">
                <button
                  onClick={() => { setMode("signin"); setMessage(null); }}
                  className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                    mode === "signin"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  로그인
                </button>
                <button
                  onClick={() => { setMode("signup"); setMessage(null); }}
                  className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                    mode === "signup"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-neutral-400 hover:text-neutral-600"
                  }`}
                >
                  회원가입
                </button>
              </div>

              <form onSubmit={handlePasswordAuth} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    이메일
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                    비밀번호
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="최소 6자"
                    minLength={6}
                    className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-2 rounded-lg transition-colors mt-1"
                >
                  {loading
                    ? "처리 중..."
                    : mode === "signin"
                    ? "로그인"
                    : "회원가입"}
                </button>
              </form>
            </>
          )}

          {/* Magic link tab */}
          {tab === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                이메일 주소를 입력하면 로그인 링크를 보내드립니다. 비밀번호가 필요 없습니다.
              </p>
              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm py-2 rounded-lg transition-colors"
              >
                {loading ? "발송 중..." : "매직 링크 발송"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
