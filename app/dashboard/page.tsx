import { Header, SectionHeader, DataTable, ActionButtons } from "@/components";
import type { DashboardData } from "@/lib/types";
import dashboardData from "@/data/latest.json";

const data = dashboardData as DashboardData;

const cryptoMarketRows = [
  { label: "BTC Price", ...data.crypto_market.btc_price, format: "currency" as const },
  { label: "ETH Price", ...data.crypto_market.eth_price, format: "currency" as const },
  { label: "BTC Dominance", ...data.crypto_market.btc_dominance, format: "percent" as const },
  { label: "BTC/Gold Ratio", ...data.crypto_market.btc_gold_ratio, format: "number" as const },
  { label: "ETH/BTC", ...data.crypto_market.eth_btc_ratio, format: "ratio" as const },
  { label: "Fear & Greed", ...data.crypto_market.fear_greed, format: "number" as const },
  { label: "Realized Vol 7D", ...data.crypto_market.vol_7d, format: "percent" as const },
  { label: "Realized Vol 30D", ...data.crypto_market.vol_30d, format: "percent" as const },
  { label: "NASDAQ", ...data.crypto_market.nasdaq, format: "number" as const },
  { label: "MSTR", ...data.crypto_market.mstr, format: "currency" as const },
  { label: "BMNR", ...data.crypto_market.bmnr, format: "currency" as const },
  { label: "CME Gap", ...data.crypto_market.cme_gap, format: "currency" as const },
];

const fundFlowRows = [
  { label: "BTC ETF Net Inflow", ...data.fund_flow.btc_etf_flow, format: "compact" as const },
  { label: "ETH ETF Net Inflow", ...data.fund_flow.eth_etf_flow, format: "compact" as const },
  { label: "Stablecoin Supply", ...data.fund_flow.stablecoin_supply, format: "compact" as const },
  { label: "┗ Ethereum", ...data.fund_flow.stablecoin_by_chain.ethereum, format: "compact" as const },
  { label: "┗ Tron", ...data.fund_flow.stablecoin_by_chain.tron, format: "compact" as const },
  { label: "┗ BSC", ...data.fund_flow.stablecoin_by_chain.bsc, format: "compact" as const },
  { label: "CEX Net Flow BTC", ...data.fund_flow.cex_flow_btc, format: "number" as const },
  { label: "CEX Net Flow ETH", ...data.fund_flow.cex_flow_eth, format: "number" as const },
  { label: "Miner Breakeven", ...data.fund_flow.miner_breakeven, format: "currency" as const },
  { label: "Aave Total Borrow", ...data.fund_flow.aave_borrow, format: "compact" as const },
  { label: "BTC Open Interest", ...data.fund_flow.btc_oi, format: "compact" as const },
  { label: "Long/Short Ratio", ...data.fund_flow.long_short_ratio, format: "number" as const },
  { label: "Funding Rate", ...data.fund_flow.funding_rate, format: "percent" as const },
];

const macroRows = [
  { label: "DXY", ...data.macro.dxy, format: "number" as const },
  { label: "US 10Y Yield", ...data.macro.us_10y, format: "percent" as const },
  { label: "Gold", ...data.macro.gold, format: "currency" as const },
  { label: "S&P 500", ...data.macro.sp500, format: "number" as const },
  { label: "FedWatch Rate", current: data.macro.fedwatch_rate.current, previous: data.macro.fedwatch_rate.previous },
];

export default function Dashboard() {
  return (
    <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <Header updatedAt={data.updated_at} />

      <div className="flex justify-end mb-6">
        <ActionButtons />
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
