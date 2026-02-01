"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchSummary, queryKeys } from "@/lib/api/fetchers";

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: fetchSummary,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useSummarySuspense() {
  return useSuspenseQuery({
    queryKey: queryKeys.summary,
    queryFn: fetchSummary,
    staleTime: 60 * 60 * 1000,
  });
}
