"use client";

export default function GlobalFilter({
  children,
  onMenuClick,
}: {
  children?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 px-3 py-2">
      {/* 햄버거 버튼 (모바일 전용) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden px-2 py-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        aria-label="메뉴 열기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex-1" />
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
