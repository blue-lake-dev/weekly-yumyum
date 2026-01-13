"use client";

import { useEffect, useState, useCallback } from "react";
import { Header, SectionHeader, DataTable, ActionButtons } from "@/components";
import type { DashboardData } from "@/lib/types";

// Source URLs for manual input fields
const SOURCE_URLS = {
  btc_etf: "https://defillama.com/etfs",
  eth_etf: "https://defillama.com/etfs/ethereum",
  cex_flow_btc: "https://www.coinglass.com/spot-inflow-outflow",
  cex_flow_eth: "https://www.coinglass.com/spot-inflow-outflow",
  miner_breakeven: "https://en.macromicro.me/macro",
  btc_oi: "https://www.coinglass.com/open-interest/BTC",
  long_short_ratio: "https://www.coinglass.com/LongShortRatio",
  fedwatch:
    "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
};

function buildRows(data: DashboardData) {
  const cryptoMarketRows = [
    {
      label: "BTC Price",
      ...data.crypto_market.btc_price,
      format: "currency" as const,
    },
    {
      label: "ETH Price",
      ...data.crypto_market.eth_price,
      format: "currency" as const,
    },
    {
      label: "BTC Dominance",
      ...data.crypto_market.btc_dominance,
      format: "percent" as const,
    },
    {
      label: "BTC/Gold Ratio",
      ...data.crypto_market.btc_gold_ratio,
      format: "number" as const,
    },
    {
      label: "ETH/BTC",
      ...data.crypto_market.eth_btc_ratio,
      format: "ratio" as const,
    },
    {
      label: "Fear & Greed",
      ...data.crypto_market.fear_greed,
      format: "number" as const,
    },
    {
      label: "Realized Vol 7D",
      ...data.crypto_market.vol_7d,
      format: "percent" as const,
    },
    {
      label: "Realized Vol 30D",
      ...data.crypto_market.vol_30d,
      format: "percent" as const,
    },
    {
      label: "NASDAQ",
      ...data.crypto_market.nasdaq,
      format: "number" as const,
    },
    { label: "MSTR", ...data.crypto_market.mstr, format: "currency" as const },
    { label: "BMNR", ...data.crypto_market.bmnr, format: "currency" as const },
    {
      label: "CME Gap",
      ...data.crypto_market.cme_gap,
      format: "currency" as const,
    },
  ];

  const lendingRows =
    data.fund_flow.defi_top_protocols?.map((p) => ({
      label: `┗ ${p.name}`,
      ...p.borrow,
      format: "compact" as const,
    })) || [];

  const fundFlowRows = [
    {
      label: "BTC ETF Net Inflow",
      ...data.fund_flow.btc_etf_flow,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.btc_etf,
    },
    {
      label: "ETH ETF Net Inflow",
      ...data.fund_flow.eth_etf_flow,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.eth_etf,
    },
    {
      label: "Stablecoin Supply",
      ...data.fund_flow.stablecoin_supply,
      format: "compact" as const,
    },
    {
      label: "┗ Ethereum",
      ...data.fund_flow.stablecoin_by_chain.ethereum,
      format: "compact" as const,
    },
    {
      label: "┗ Tron",
      ...data.fund_flow.stablecoin_by_chain.tron,
      format: "compact" as const,
    },
    {
      label: "┗ BSC",
      ...data.fund_flow.stablecoin_by_chain.bsc,
      format: "compact" as const,
    },
    {
      label: "CEX Net Flow BTC",
      ...data.fund_flow.cex_flow_btc,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.cex_flow_btc,
    },
    {
      label: "CEX Net Flow ETH",
      ...data.fund_flow.cex_flow_eth,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.cex_flow_eth,
    },
    {
      label: "Miner Breakeven",
      ...data.fund_flow.miner_breakeven,
      format: "currency" as const,
      sourceUrl: SOURCE_URLS.miner_breakeven,
    },
    {
      label: "DeFi Total Borrow",
      ...data.fund_flow.defi_total_borrow,
      format: "compact" as const,
    },
    ...lendingRows,
    {
      label: "BTC Open Interest",
      ...data.fund_flow.btc_oi,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.btc_oi,
    },
    {
      label: "Long/Short Ratio",
      ...data.fund_flow.long_short_ratio,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.long_short_ratio,
    },
    {
      label: "Funding Rate (BTC)",
      ...data.fund_flow.funding_rate,
      format: "percent" as const,
    },
  ];

  const macroRows = [
    { label: "DXY", ...data.macro.dxy, format: "number" as const },
    { label: "US 10Y Yield", ...data.macro.us_10y, format: "percent" as const },
    { label: "Gold", ...data.macro.gold, format: "currency" as const },
    { label: "S&P 500", ...data.macro.sp500, format: "number" as const },
    {
      label: "FedWatch Rate",
      ...data.macro.fedwatch_rate,
      sourceUrl: SOURCE_URLS.fedwatch,
    },
  ];

  return { cryptoMarketRows, fundFlowRows, macroRows };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/data");
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError("데이터를 불러올 수 없습니다");
      }
    } catch {
      setError("서버 연결에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/fetch-data", { method: "POST" });
      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "데이터 새로고침에 실패했습니다");
      }
    } catch {
      setError("서버 연결에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading skeleton
  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-neutral/10 rounded mb-6 w-64" />
          <div className="flex justify-end mb-6">
            <div className="h-8 bg-neutral/10 rounded w-48" />
          </div>
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-6 bg-neutral/10 rounded w-32 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-8 bg-neutral/5 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-foreground text-background rounded-md hover:opacity-90"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const { cryptoMarketRows, fundFlowRows, macroRows } = buildRows(data);

  return (
    <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <Header updatedAt={data.updated_at} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <ActionButtons onRefresh={handleRefresh} isLoading={isLoading} />
      </div>

      <div className="space-y-8">
        <section>
          <SectionHeader emoji="📊" title="암호화폐 시장" />
          <DataTable data={cryptoMarketRows} />
        </section>

        <section>
          <SectionHeader emoji="💰" title="자금흐름" />
          <DataTable data={fundFlowRows} />
        </section>

        <section>
          <SectionHeader emoji="🌍" title="매크로" />
          <DataTable data={macroRows} />
        </section>
      </div>
    </main>
  );
}
