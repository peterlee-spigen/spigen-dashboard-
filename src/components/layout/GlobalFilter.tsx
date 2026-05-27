"use client";
import { useFilterStore, DATE_PRESETS, AdType, CampaignStatus } from "@/store/filter-store";

export default function GlobalFilter({
  children,
  onMenuClick,
}: {
  children?: React.ReactNode;
  onMenuClick?: () => void;
}) {
  const { dateFrom, dateTo, adTypes, campaignStatus, asinQuery,
    setDateRange, toggleAdType, setCampaignStatus, setAsinQuery } = useFilterStore();

  function applyPreset(days: number) {
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    setDateRange(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
  }

  return (
    <div className="flex items-center bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
      {/* 햄버거 버튼 (모바일 전용) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden shrink-0 px-4 py-3 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
        aria-label="메뉴 열기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 필터 컨트롤 — 모바일에서 가로 스크롤 */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex items-center gap-3 px-4 lg:px-6 py-3 text-sm whitespace-nowrap min-w-0">
          {/* 날짜 프리셋 */}
          <div className="flex gap-1">
            {DATE_PRESETS.map(({ label, days }) => (
              <button
                key={label}
                onClick={() => applyPreset(days)}
                className="px-2.5 py-1 rounded text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>

          {/* 날짜 직접 입력 */}
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom}
              onChange={(e) => setDateRange(e.target.value, dateTo)}
              className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-xs bg-white dark:bg-neutral-800" />
            <span className="text-neutral-400">~</span>
            <input type="date" value={dateTo}
              onChange={(e) => setDateRange(dateFrom, e.target.value)}
              className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-xs bg-white dark:bg-neutral-800" />
          </div>

          {/* 광고 유형 */}
          <div className="flex gap-1">
            {(["SP", "SB", "SD"] as AdType[]).map((t) => (
              <button
                key={t}
                onClick={() => toggleAdType(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  adTypes.includes(t)
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* 캠페인 상태 */}
          <select
            value={campaignStatus}
            onChange={(e) => setCampaignStatus(e.target.value as CampaignStatus)}
            className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-xs bg-white dark:bg-neutral-800"
          >
            <option value="ALL">전체 상태</option>
            <option value="ENABLED">ENABLED</option>
            <option value="PAUSED">PAUSED</option>
          </select>

          {/* ASIN 검색 */}
          <input
            type="text"
            placeholder="ASIN / 상품명 검색"
            value={asinQuery}
            onChange={(e) => setAsinQuery(e.target.value)}
            className="border border-neutral-300 dark:border-neutral-600 rounded px-2 py-1 text-xs bg-white dark:bg-neutral-800 w-44"
          />
        </div>
      </div>

      {/* 우측 슬롯 (로그아웃 버튼) */}
      {children && (
        <div className="shrink-0 px-3 py-3">
          {children}
        </div>
      )}
    </div>
  );
}
