import Sidebar from "@/components/layout/Sidebar";
import GlobalFilter from "@/components/layout/GlobalFilter";
import FilterStoreInitializer from "@/components/layout/FilterStoreInitializer";
import LogoutButton from "@/components/auth/LogoutButton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex bg-neutral-50 dark:bg-neutral-950">
      <FilterStoreInitializer />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <GlobalFilter>
          <LogoutButton />
        </GlobalFilter>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
