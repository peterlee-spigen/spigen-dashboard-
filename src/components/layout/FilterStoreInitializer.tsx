"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useFilterStore } from "@/store/filter-store";

/**
 * DB에서 가장 최신 데이터 날짜를 조회하고,
 * 필터 기본값을 "최신날짜 기준 최근 30일"로 초기화합니다.
 * 이미 초기화된 경우 아무 작업도 하지 않습니다.
 */
export default function FilterStoreInitializer() {
  const initialized = useFilterStore((s) => s.initialized);
  const setInitialized = useFilterStore((s) => s.setInitialized);

  useEffect(() => {
    if (initialized) return;

    async function init() {
      try {
        // ad_campaigns 테이블에서 최신 날짜 조회
        const { data, error } = await supabase
          .from("ad_campaigns")
          .select("date")
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (error || !data?.date) return; // 데이터 없으면 기본값 유지

        const maxDate: string = data.date; // "2026-03-31" 형태
        const to = new Date(maxDate);
        const from = new Date(to.getTime() - 29 * 86400000);

        setInitialized(
          from.toISOString().slice(0, 10),
          to.toISOString().slice(0, 10),
        );
      } catch {
        // 조회 실패 시 기본값 유지
      }
    }

    init();
  }, [initialized, setInitialized]);

  return null;
}
