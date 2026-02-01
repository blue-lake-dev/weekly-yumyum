"use client";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { fetchChainData, queryKeys, type Chain } from "@/lib/api/fetchers";

export function useChainData(chain: Chain) {
  return useQuery({
    queryKey: queryKeys.chain(chain),
    queryFn: () => fetchChainData(chain),
    staleTime: 15 * 60 * 1000, // 15 min
  });
}

export function useChainDataSuspense(chain: Chain) {
  return useSuspenseQuery({
    queryKey: queryKeys.chain(chain),
    queryFn: () => fetchChainData(chain),
    staleTime: 15 * 60 * 1000,
  });
}
