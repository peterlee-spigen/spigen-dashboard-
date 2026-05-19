import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import GlobalFilter from "@/components/layout/GlobalFilter";
import FilterStoreInitializer from "@/components/layout/FilterStoreInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spigen DE 광고 대시보드",
  description: "Spigen 독일 법인 통합 광고·판매·재고 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-neutral-50 dark:bg-neutral-950">
        <FilterStoreInitializer />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <GlobalFilter />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
