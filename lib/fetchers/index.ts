import type { DashboardData, CryptoMarket, FundFlow, Macro, MetricValue } from "../types";
import { fetchAllCoinGeckoData } from "./coingecko";
import { fetchFearGreed } from "./alternative";
import {
  fetchNasdaq,
  fetchMstr,
  fetchBmnr,
  fetchDxy,
  fetchUs10y,
  fetchGold,
  fetchSp500,
  fetchVol7d,
  fetchVol30d,
  fetchCmeGap,
} from "./yahoo-finance";
import {
  fetchStablecoinSupply,
  fetchStablecoinByChain,
  fetchTopLendingProtocols,
  fetchBtcEtfFlow,
  fetchEthEtfFlow,
} from "./defillama";

// Helper to calculate change percentage
function calcChangePct(current: number | null, previous: number | null): number | undefined {
  if (current === null || previous === null || previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

// Helper to calculate ratio MetricValue with both current and previous
function calcRatio(
  numerator: MetricValue,
  denominator: MetricValue,
  source: MetricValue["source"]
): MetricValue {
  const numCurrent = typeof numerator.current === "number" ? numerator.current : null;
  const denCurrent = typeof denominator.current === "number" ? denominator.current : null;
  const numPrevious = typeof numerator.previous === "number" ? numerator.previous : null;
  const denPrevious = typeof denominator.previous === "number" ? denominator.previous : null;

  if (numCurrent === null || denCurrent === null || denCurrent === 0) {
    return { current: null, error: "Missing data for ratio calculation", source };
  }

  const current = numCurrent / denCurrent;
  const previous = numPrevious !== null && denPrevious !== null && denPrevious !== 0
    ? numPrevious / denPrevious
    : null;

  return {
    current,
    current_at: numerator.current_at, // Use numerator's timestamp
    previous,
    previous_at: numerator.previous_at,
    change_pct: calcChangePct(current, previous),
    source,
  };
}

// Fetch all crypto market data
async function fetchCryptoMarket(): Promise<CryptoMarket> {
  // Fetch CoinGecko data first (combined to avoid rate limiting)
  const coinGeckoData = await fetchAllCoinGeckoData();
  const { btcPrice, ethPrice, btcDominance } = coinGeckoData;

  // Fetch other data in parallel
  const [
    fearGreed,
    vol7d,
    vol30d,
    mstr,
    bmnr,
    gold,
    cmeGap,
  ] = await Promise.all([
    fetchFearGreed(),
    fetchVol7d(),
    fetchVol30d(),
    fetchMstr(),
    fetchBmnr(),
    fetchGold(),
    fetchCmeGap(),
  ]);

  // Calculate derived values with both current and previous
  const btcGoldRatio = calcRatio(btcPrice, gold, "yahoo");
  const ethBtcRatio = calcRatio(ethPrice, btcPrice, "coingecko");

  return {
    btc_price: btcPrice,
    eth_price: ethPrice,
    btc_dominance: btcDominance,
    btc_gold_ratio: btcGoldRatio,
    eth_btc_ratio: ethBtcRatio,
    fear_greed: fearGreed,
    mvrv: { current: null, isManual: true, source: "manual" },
    vol_7d: vol7d,
    vol_30d: vol30d,
    mstr,
    bmnr,
    cme_gap: cmeGap,
  };
}

// Fetch all fund flow data
async function fetchFundFlow(): Promise<FundFlow> {
  const [
    btcEtfFlow,
    ethEtfFlow,
    stablecoinSupply,
    ethereumStable,
    baseStable,
    arbitrumStable,
    optimismStable,
    tronStable,
    bscStable,
    solanaStable,
    lendingData,
  ] = await Promise.all([
    fetchBtcEtfFlow(),
    fetchEthEtfFlow(),
    fetchStablecoinSupply(),
    fetchStablecoinByChain("Ethereum"),
    fetchStablecoinByChain("Base"),
    fetchStablecoinByChain("Arbitrum"),
    fetchStablecoinByChain("Optimism"),
    fetchStablecoinByChain("Tron"),
    fetchStablecoinByChain("BSC"),
    fetchStablecoinByChain("Solana"),
    fetchTopLendingProtocols(),
  ]);

  return {
    btc_etf_flow: btcEtfFlow,
    eth_etf_flow: ethEtfFlow,
    stablecoin_supply: stablecoinSupply,
    stablecoin_by_chain: {
      ethereum: ethereumStable,
      base: baseStable,
      arbitrum: arbitrumStable,
      optimism: optimismStable,
      tron: tronStable,
      bsc: bscStable,
      solana: solanaStable,
    },
    // Manual input fields (APIs not accessible)
    cex_flow_btc: { current: null, isManual: true, source: "manual" },
    cex_flow_eth: { current: null, isManual: true, source: "manual" },
    miner_breakeven: { current: null, isManual: true, source: "manual" },
    defi_total_borrow: lendingData.total,
    defi_top_protocols: lendingData.protocols,
    btc_oi: { current: null, isManual: true, source: "manual" },
    long_short_ratio: { current: null, isManual: true, source: "manual" },
    funding_rate: { current: null, isManual: true, source: "manual" },
  };
}

// Fetch all macro data
async function fetchMacro(): Promise<Macro> {
  const [dxy, us10y, gold, sp500, nasdaq] = await Promise.all([
    fetchDxy(),
    fetchUs10y(),
    fetchGold(),
    fetchSp500(),
    fetchNasdaq(),
  ]);

  // Calculate S&P 500 / NASDAQ ratio with both current and previous
  const sp500NasdaqRatio = calcRatio(sp500, nasdaq, "yahoo");

  return {
    // Auto-fetched
    dxy,
    us_10y: us10y,
    gold,
    sp500,
    nasdaq,
    sp500_nasdaq_ratio: sp500NasdaqRatio,
    // Manual inputs (monthly releases)
    cpi: { current: null, isManual: true, source: "manual" },
    ppi: { current: null, isManual: true, source: "manual" },
    nfp: { current: null, isManual: true, source: "manual" },
    unemployment: { current: null, isManual: true, source: "manual" },
    sofr: { current: null, isManual: true, source: "manual" },
    fedwatch_rate: { current: null, isManual: true, source: "manual" },
  };
}

// Main function to fetch all data
export async function fetchAllData(): Promise<DashboardData> {
  const [cryptoMarket, fundFlow, macro] = await Promise.all([
    fetchCryptoMarket(),
    fetchFundFlow(),
    fetchMacro(),
  ]);

  return {
    updated_at: new Date().toISOString(),
    crypto_market: cryptoMarket,
    fund_flow: fundFlow,
    macro,
  };
}

// Get list of errors from fetched data
export function getErrors(data: DashboardData): string[] {
  const errors: string[] = [];

  const checkErrors = (obj: Record<string, unknown>, prefix: string) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object") {
        if ("error" in value && value.error && !("isManual" in value && value.isManual)) {
          errors.push(`${prefix}.${key}: ${value.error}`);
        } else if (!("current" in value)) {
          checkErrors(value as Record<string, unknown>, `${prefix}.${key}`);
        }
      }
    }
  };

  checkErrors(data.crypto_market as unknown as Record<string, unknown>, "crypto_market");
  checkErrors(data.fund_flow as unknown as Record<string, unknown>, "fund_flow");
  checkErrors(data.macro as unknown as Record<string, unknown>, "macro");

  return errors;
}
