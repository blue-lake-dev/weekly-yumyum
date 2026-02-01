"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchRwa, queryKeys } from "@/lib/api/fetchers";

export function useRwa() {
  return useQuery({
    queryKey: queryKeys.rwa,
    queryFn: fetchRwa,
    staleTime: 15 * 60 * 1000, // 15 min
    enabled: false, // Disabled until RWA endpoint is ready
  });
}

export function useRwaSuspense() {
  return useSuspenseQuery({
    queryKey: queryKeys.rwa,
    queryFn: fetchRwa,
    staleTime: 15 * 60 * 1000,
  });
}
