"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Executive Summary", icon: "▦" },
  { href: "/ads", label: "광고 성과", icon: "◈" },
  { href: "/products", label: "상품 성과", icon: "◉" },
  { href: "/inventory", label: "재고 관리", icon: "▣" },
  { href: "/traffic", label: "트래픽 분석", icon: "◎" },
  { href: "/upload", label: "데이터 업로드", icon: "▲" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-52 shrink-0 bg-neutral-900 dark:bg-neutral-950 text-neutral-100 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-neutral-700">
        <p className="text-xs text-neutral-400 uppercase tracking-widest">Spigen DE</p>
        <p className="text-sm font-semibold mt-0.5">광고 대시보드</p>
      </div>
      <nav className="flex-1 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
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
      <div className="px-5 py-3 border-t border-neutral-700 text-xs text-neutral-500">
        통화: EUR
      </div>
    </aside>
  );
}
