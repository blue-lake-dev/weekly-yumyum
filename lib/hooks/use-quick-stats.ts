"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchQuickStats, queryKeys } from "@/lib/api/fetchers";

export function useQuickStats() {
  return useQuery({
    queryKey: queryKeys.quickStats,
    queryFn: fetchQuickStats,
    staleTime: 15 * 60 * 1000, // 15 min
    refetchInterval: 30 * 60 * 1000, // Poll every 30 min
  });
}
