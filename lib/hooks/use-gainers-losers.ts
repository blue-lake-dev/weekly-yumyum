"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchGainersLosers, queryKeys } from "@/lib/api/fetchers";

export function useGainersLosers() {
  return useQuery({
    queryKey: queryKeys.gainersLosers,
    queryFn: fetchGainersLosers,
    staleTime: 15 * 60 * 1000, // 15 min
    refetchInterval: 15 * 60 * 1000, // Poll every 15 min
  });
}

export function useGainersLosersSuspense() {
  return useSuspenseQuery({
    queryKey: queryKeys.gainersLosers,
    queryFn: fetchGainersLosers,
    staleTime: 15 * 60 * 1000,
  });
}
