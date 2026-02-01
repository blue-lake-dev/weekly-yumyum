import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { Dashboard } from "@/components/Dashboard";
import {
  fetchTicker,
  fetchQuickStats,
  fetchGainersLosers,
  fetchSummary,
  fetchChainData,
  fetchDerivatives,
  queryKeys,
} from "@/lib/api/fetchers";

export default async function Home() {
  const queryClient = getQueryClient();

  // ❶ BLOCKING PREFETCH: Await only "Above the Fold" data
  // This ensures Ticker and QuickStats render instantly
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.ticker,
      queryFn: fetchTicker,
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.quickStats,
      queryFn: fetchQuickStats,
    }),
  ]);

  // ❷ STREAMING PREFETCH: Kick off but DO NOT await
  // These will stream to the client as they resolve
  queryClient.prefetchQuery({
    queryKey: queryKeys.gainersLosers,
    queryFn: fetchGainersLosers,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.summary,
    queryFn: fetchSummary,
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.chain("eth"),
    queryFn: () => fetchChainData("eth"),
  });
  queryClient.prefetchQuery({
    queryKey: queryKeys.derivatives,
    queryFn: fetchDerivatives,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  );
}
