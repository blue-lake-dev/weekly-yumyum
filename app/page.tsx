import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { Dashboard } from "@/components/Dashboard";

// Force dynamic rendering - API data changes frequently
export const dynamic = "force-dynamic";
import {
  fetchTicker,
  fetchQuickStats,
  fetchGainersLosers,
  fetchSummary,
  fetchDerivatives,
  fetchEthPrice,
  fetchEthStats,
  fetchEthCharts,
  fetchEthHoldings,
  fetchSolPrice,
  fetchSolStats,
  fetchSolCharts,
  fetchSolHoldings,
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
  queryClient.prefetchQuery({ queryKey: queryKeys.ethPrice, queryFn: fetchEthPrice });
  queryClient.prefetchQuery({ queryKey: queryKeys.ethStats, queryFn: fetchEthStats });
  queryClient.prefetchQuery({ queryKey: queryKeys.ethCharts, queryFn: fetchEthCharts });
  queryClient.prefetchQuery({ queryKey: queryKeys.ethHoldings, queryFn: fetchEthHoldings });
  queryClient.prefetchQuery({ queryKey: queryKeys.solPrice, queryFn: fetchSolPrice });
  queryClient.prefetchQuery({ queryKey: queryKeys.solStats, queryFn: fetchSolStats });
  queryClient.prefetchQuery({ queryKey: queryKeys.solCharts, queryFn: fetchSolCharts });
  queryClient.prefetchQuery({ queryKey: queryKeys.solHoldings, queryFn: fetchSolHoldings });
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
