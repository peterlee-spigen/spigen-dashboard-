"use client";
import { create } from "zustand";
import { getPriorPeriod } from "@/lib/date-utils";

export type AdType = "SP" | "SB" | "SD";
export type CampaignStatus = "ALL" | "ENABLED" | "PAUSED";

interface FilterState {
  dateFrom: string;
  dateTo: string;
  prevDateFrom: string;
  prevDateTo: string;
  adTypes: AdType[];
  campaignStatus: CampaignStatus;
  asinQuery: string;
  initialized: boolean;
  setDateRange: (from: string, to: string) => void;
  toggleAdType: (type: AdType) => void;
  setCampaignStatus: (s: CampaignStatus) => void;
  setAsinQuery: (q: string) => void;
  setInitialized: (from: string, to: string) => void;
}

const today = new Date();
const defaultTo = today.toISOString().slice(0, 10);
const defaultFrom = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
const { prevFrom: defaultPrevFrom, prevTo: defaultPrevTo } = getPriorPeriod(defaultFrom, defaultTo);

export const useFilterStore = create<FilterState>((set) => ({
  dateFrom: defaultFrom,
  dateTo: defaultTo,
  prevDateFrom: defaultPrevFrom,
  prevDateTo: defaultPrevTo,
  adTypes: ["SP", "SB", "SD"],
  campaignStatus: "ALL",
  asinQuery: "",
  initialized: false,
  setDateRange: (from, to) => {
    const { prevFrom, prevTo } = getPriorPeriod(from, to);
    set({ dateFrom: from, dateTo: to, prevDateFrom: prevFrom, prevDateTo: prevTo });
  },
  toggleAdType: (type) =>
    set((s) => ({
      adTypes: s.adTypes.includes(type)
        ? s.adTypes.filter((t) => t !== type)
        : [...s.adTypes, type],
    })),
  setCampaignStatus: (campaignStatus) => set({ campaignStatus }),
  setAsinQuery: (asinQuery) => set({ asinQuery }),
  setInitialized: (from, to) => {
    const { prevFrom, prevTo } = getPriorPeriod(from, to);
    set({ dateFrom: from, dateTo: to, prevDateFrom: prevFrom, prevDateTo: prevTo, initialized: true });
  },
}));

export const DATE_PRESETS = [
  { label: "오늘", days: 0 },
  { label: "최근 7일", days: 6 },
  { label: "최근 14일", days: 13 },
  { label: "최근 30일", days: 29 },
  { label: "최근 90일", days: 89 },
];
