"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchDerivatives, queryKeys } from "@/lib/api/fetchers";

export function useDerivatives() {
  return useQuery({
    queryKey: queryKeys.derivatives,
    queryFn: fetchDerivatives,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchInterval: 5 * 60 * 1000, // Poll every 5 min
  });
}

export function useDerivativesSuspense() {
  return useSuspenseQuery({
    queryKey: queryKeys.derivatives,
    queryFn: fetchDerivatives,
    staleTime: 5 * 60 * 1000,
  });
}
