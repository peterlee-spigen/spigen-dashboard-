"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/reports", label: "광고 리포트", icon: "◇" },
  { href: "/compare", label: "비교 대시보드", icon: "⊞" },
];

export default function Sidebar({
  userEmail,
  onClose,
}: {
  userEmail?: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="w-52 h-full min-h-screen shrink-0 bg-neutral-900 dark:bg-neutral-950 text-neutral-100 flex flex-col">
      {/* 헤더 */}
      <div className="px-5 py-5 border-b border-neutral-700 flex items-center justify-between">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-widest">Spigen DE</p>
          <p className="text-sm font-semibold mt-0.5">광고 대시보드</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-neutral-400 hover:text-white transition-colors"
            aria-label="메뉴 닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 유저 영역 */}
      <div className="border-t border-neutral-700">
        {userEmail && (
          <Link
            href="/mypage"
            onClick={onClose}
            className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${
              pathname === "/mypage"
                ? "bg-blue-600 text-white"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-neutral-600 flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
              {userEmail[0]}
            </span>
            <span className="text-xs truncate">{userEmail}</span>
          </Link>
        )}
        <div className="px-5 py-2 text-xs text-neutral-500">
          통화: EUR
        </div>
      </div>
    </aside>
  );
}
