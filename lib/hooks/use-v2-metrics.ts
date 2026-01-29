"use client";

import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import type { MetricRow } from "@/lib/database.types";

// Metric keys we need for the V2 dashboard
const DASHBOARD_METRIC_KEYS = [
  "eth_price",
  "eth_supply",
  "eth_burn",
  "eth_issuance",
  "eth_tvl",
  "btc_price",
  "btc_dominance",
  "fear_greed",
  "stablecoin_total",
  "stablecoin_by_chain",
  "rwa_by_chain",
  "etf_flow_eth",
  "etf_flow_btc",
  "etf_holdings_total",
  "dat_holdings_total",
] as const;

export type DashboardMetricKey = (typeof DASHBOARD_METRIC_KEYS)[number];

// Processed metrics for the dashboard
export interface DashboardMetrics {
  // ETH Section
  ethPrice: number | null;
  ethPriceChange: number | null;
  ethPriceHistory: Array<{ date: string; price: number }>;
  ethSupply: number | null;
  ethSupplyHistory: Array<{ date: string; value: number }>;
  ethBurn: number | null;
  ethIssuance: number | null;
  ethBurnIssuanceHistory: Array<{ date: string; burn: number; issuance: number }>;
  ethTvl: number | null;
  ethTvlHistory: Array<{ date: string; value: number }>;

  // ETH Holdings (displayed in ETH Section)
  etfHoldingsEth: number | null; // ETH amount held by ETFs
  etfHoldingsPct: number | null; // % of total supply
  datHoldingsEth: number | null; // ETH amount held by DAT (corporate treasuries)
  datHoldingsPct: number | null; // % of total supply

  // Market Section
  btcPrice: number | null;
  btcPriceChange: number | null;
  btcDominance: number | null;
  fearGreed: number | null;
  stablecoinTotal: number | null;
  stablecoinByChain: Record<string, number>;

  // RWA Section
  rwaTotal: number | null;
  rwaByChain: Record<string, number>;

  // ETF Flows Section
  etfFlowEth: number | null;
  etfFlowEthHistory: Array<{ date: string; value: number }>;
  etfFlowBtc: number | null;
  etfFlowBtcHistory: Array<{ date: string; value: number }>;

  // Meta
  lastUpdated: string | null;
}

interface UseV2MetricsResult {
  data: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Get date string for N days ago
function getDateNDaysAgo(n: number): string {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return date.toISOString().split("T")[0];
}

// Format date for chart display (M/DD)
function formatChartDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${parseInt(month)}/${parseInt(day)}`;
}

export function useV2Metrics(): UseV2MetricsResult {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger((prev) => prev + 1);

  useEffect(() => {
    async function fetchMetrics() {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();
        // Use 14 calendar days to ensure we get 7 trading days for ETF data
        const fourteenDaysAgo = getDateNDaysAgo(14);

        // Fetch all metrics for the last 14 days
        const { data: rows, error: fetchError } = await supabase
          .from("metrics")
          .select("*")
          .in("key", DASHBOARD_METRIC_KEYS)
          .gte("date", fourteenDaysAgo)
          .order("date", { ascending: true });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (!rows || rows.length === 0) {
          setData(null);
          setIsLoading(false);
          return;
        }

        // Cast rows to MetricRow[] since Supabase generic types are not fully inferred
        const metricRows = rows as MetricRow[];

        // Group rows by key
        const byKey = new Map<string, MetricRow[]>();
        for (const row of metricRows) {
          const existing = byKey.get(row.key) || [];
          existing.push(row);
          byKey.set(row.key, existing);
        }

        // Helper to get latest row for a key
        const getLatest = (key: string): MetricRow | null => {
          const keyRows = byKey.get(key);
          return keyRows?.[keyRows.length - 1] ?? null;
        };

        // Helper to get history array for a key
        const getHistory = (key: string): MetricRow[] => {
          return byKey.get(key) || [];
        };

        // Process ETH price
        const ethPriceLatest = getLatest("eth_price");
        const ethPriceHistory = getHistory("eth_price").map((r) => ({
          date: formatChartDate(r.date),
          price: r.value ?? 0,
        }));

        // Process ETH supply
        const ethSupplyLatest = getLatest("eth_supply");
        const ethSupplyHistory = getHistory("eth_supply").map((r) => ({
          date: formatChartDate(r.date),
          value: r.value ?? 0,
        }));

        // Process burn/issuance
        const burnHistory = getHistory("eth_burn");
        const issuanceHistory = getHistory("eth_issuance");
        const burnIssuanceHistory: Array<{ date: string; burn: number; issuance: number }> = [];

        // Merge burn and issuance by date
        const burnByDate = new Map(burnHistory.map((r) => [r.date, r.value ?? 0]));
        const issuanceByDate = new Map(issuanceHistory.map((r) => [r.date, r.value ?? 0]));
        const allDates = new Set([...burnByDate.keys(), ...issuanceByDate.keys()]);
        for (const date of Array.from(allDates).sort()) {
          burnIssuanceHistory.push({
            date: formatChartDate(date),
            burn: burnByDate.get(date) ?? 0,
            issuance: issuanceByDate.get(date) ?? 0,
          });
        }

        // Process TVL
        const ethTvlLatest = getLatest("eth_tvl");
        const ethTvlHistory = getHistory("eth_tvl").map((r) => ({
          date: formatChartDate(r.date),
          value: r.value ?? 0,
        }));

        // Process market metrics
        const btcPriceLatest = getLatest("btc_price");
        const btcDomLatest = getLatest("btc_dominance");
        const fearGreedLatest = getLatest("fear_greed");
        const stableTotalLatest = getLatest("stablecoin_total");
        const stableByChainLatest = getLatest("stablecoin_by_chain");

        // Process RWA
        const rwaByChainLatest = getLatest("rwa_by_chain");

        // Process ETF flows
        const etfFlowEthLatest = getLatest("etf_flow_eth");
        const etfFlowEthHistory = getHistory("etf_flow_eth").map((r) => ({
          date: formatChartDate(r.date),
          value: r.value ?? 0,
        }));

        const etfFlowBtcLatest = getLatest("etf_flow_btc");
        const etfFlowBtcHistory = getHistory("etf_flow_btc").map((r) => ({
          date: formatChartDate(r.date),
          value: r.value ?? 0,
        }));

        // Process ETH Holdings (ETF + DAT as % of supply)
        const etfHoldingsTotalLatest = getLatest("etf_holdings_total");
        const datHoldingsTotalLatest = getLatest("dat_holdings_total");

        // Calculate percentages based on ETH supply
        const ethSupplyValue = ethSupplyLatest?.value ?? null;
        const etfHoldingsValue = etfHoldingsTotalLatest?.value ?? null;
        const datHoldingsValue = datHoldingsTotalLatest?.value ?? null;

        const etfHoldingsPct = ethSupplyValue && etfHoldingsValue
          ? (etfHoldingsValue / ethSupplyValue) * 100
          : null;
        const datHoldingsPct = ethSupplyValue && datHoldingsValue
          ? (datHoldingsValue / ethSupplyValue) * 100
          : null;

        // Build dashboard metrics
        const metrics: DashboardMetrics = {
          // ETH Section
          ethPrice: ethPriceLatest?.value ?? null,
          ethPriceChange: (ethPriceLatest?.metadata as { change_pct?: number })?.change_pct ?? null,
          ethPriceHistory,
          ethSupply: ethSupplyLatest?.value ?? null,
          ethSupplyHistory,
          ethBurn: getLatest("eth_burn")?.value ?? null,
          ethIssuance: getLatest("eth_issuance")?.value ?? null,
          ethBurnIssuanceHistory: burnIssuanceHistory,
          ethTvl: ethTvlLatest?.value ?? null,
          ethTvlHistory,

          // ETH Holdings (displayed in ETH Section)
          etfHoldingsEth: etfHoldingsValue,
          etfHoldingsPct,
          datHoldingsEth: datHoldingsValue,
          datHoldingsPct,

          // Market Section
          btcPrice: btcPriceLatest?.value ?? null,
          btcPriceChange: (btcPriceLatest?.metadata as { change_pct?: number })?.change_pct ?? null,
          btcDominance: btcDomLatest?.value ?? null,
          fearGreed: fearGreedLatest?.value ?? null,
          stablecoinTotal: stableTotalLatest?.value ?? null,
          stablecoinByChain: (stableByChainLatest?.metadata as { byChain?: Record<string, number> })?.byChain || {},

          // RWA Section
          rwaTotal: rwaByChainLatest?.value ?? null,
          rwaByChain: (rwaByChainLatest?.metadata as { byChain?: Record<string, number> })?.byChain || {},

          // ETF Flows Section
          etfFlowEth: etfFlowEthLatest?.value ?? null,
          etfFlowEthHistory,
          etfFlowBtc: etfFlowBtcLatest?.value ?? null,
          etfFlowBtcHistory,

          // Meta
          lastUpdated: ethPriceLatest?.date ?? null,
        };

        setData(metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, [refetchTrigger]);

  return { data, isLoading, error, refetch };
}
