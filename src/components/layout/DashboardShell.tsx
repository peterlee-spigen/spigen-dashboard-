"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import GlobalFilter from "@/components/layout/GlobalFilter";
import FilterStoreInitializer from "@/components/layout/FilterStoreInitializer";
import LogoutButton from "@/components/auth/LogoutButton";

export default function DashboardShell({
  userEmail,
  children,
}: {
  userEmail?: string;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
      <FilterStoreInitializer />

      {/* 모바일 오버레이 백드롭 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바: 모바일=fixed 드로어, 데스크탑=static */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <Sidebar userEmail={userEmail} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalFilter onMenuClick={() => setSidebarOpen(true)}>
          <LogoutButton />
        </GlobalFilter>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
