"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTicker, queryKeys } from "@/lib/api/fetchers";

export function useTicker() {
  return useQuery({
    queryKey: queryKeys.ticker,
    queryFn: fetchTicker,
    staleTime: 60 * 1000, // 1 min
    refetchInterval: 60 * 1000, // Poll every 1 min
  });
}
