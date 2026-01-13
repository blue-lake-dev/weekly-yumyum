import type { DashboardData, CryptoMarket, FundFlow, Macro, MetricValue } from "../types";
import { fetchBtcPrice, fetchEthPrice, fetchFundingRateBinance } from "./binance";
import { fetchBtcDominance } from "./coingecko";
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

// Fetch all crypto market data
async function fetchCryptoMarket(): Promise<CryptoMarket> {
  const [
    btcPrice,
    ethPrice,
    btcDominance,
    fearGreed,
    vol7d,
    vol30d,
    nasdaq,
    mstr,
    bmnr,
    gold,
    cmeGap,
  ] = await Promise.all([
    fetchBtcPrice(),
    fetchEthPrice(),
    fetchBtcDominance(),
    fetchFearGreed(),
    fetchVol7d(),
    fetchVol30d(),
    fetchNasdaq(),
    fetchMstr(),
    fetchBmnr(),
    fetchGold(),
    fetchCmeGap(),
  ]);

  // Calculate derived values
  const btcGoldRatio: MetricValue =
    btcPrice.current && gold.current
      ? { current: btcPrice.current / gold.current, source: "yahoo" }
      : { current: null, error: "Missing BTC or Gold price" };

  const ethBtcRatio: MetricValue =
    ethPrice.current && btcPrice.current
      ? { current: ethPrice.current / btcPrice.current, source: "binance" }
      : { current: null, error: "Missing ETH or BTC price" };

  return {
    btc_price: btcPrice,
    eth_price: ethPrice,
    btc_dominance: btcDominance,
    btc_gold_ratio: btcGoldRatio,
    eth_btc_ratio: ethBtcRatio,
    fear_greed: fearGreed,
    vol_7d: vol7d,
    vol_30d: vol30d,
    nasdaq,
    mstr,
    bmnr,
    cme_gap: cmeGap,
  };
}

// Fetch all fund flow data
async function fetchFundFlow(previousData?: FundFlow): Promise<FundFlow> {
  const [
    btcEtfFlow,
    ethEtfFlow,
    stablecoinSupply,
    ethereumStable,
    tronStable,
    bscStable,
    lendingData,
    fundingRate,
  ] = await Promise.all([
    fetchBtcEtfFlow(),
    fetchEthEtfFlow(),
    fetchStablecoinSupply(),
    fetchStablecoinByChain("Ethereum"),
    fetchStablecoinByChain("Tron"),
    fetchStablecoinByChain("BSC"),
    fetchTopLendingProtocols(),
    fetchFundingRateBinance(),
  ]);

  return {
    btc_etf_flow: btcEtfFlow,
    eth_etf_flow: ethEtfFlow,
    stablecoin_supply: stablecoinSupply,
    stablecoin_by_chain: {
      ethereum: ethereumStable,
      tron: tronStable,
      bsc: bscStable,
    },
    // Manual input fields (APIs not accessible)
    cex_flow_btc: previousData?.cex_flow_btc ?? { current: null, isManual: true, source: "manual" },
    cex_flow_eth: previousData?.cex_flow_eth ?? { current: null, isManual: true, source: "manual" },
    miner_breakeven: previousData?.miner_breakeven ?? { current: null, isManual: true, source: "manual" },
    defi_total_borrow: lendingData.total,
    defi_top_protocols: lendingData.protocols,
    btc_oi: previousData?.btc_oi ?? { current: null, isManual: true, source: "manual" },
    long_short_ratio: (previousData?.long_short_ratio?.isManual ? previousData.long_short_ratio : null) ?? { current: null, isManual: true, source: "manual" },
    funding_rate: fundingRate,
  };
}

// Fetch all macro data
async function fetchMacro(previousData?: Macro): Promise<Macro> {
  const [dxy, us10y, gold, sp500] = await Promise.all([
    fetchDxy(),
    fetchUs10y(),
    fetchGold(),
    fetchSp500(),
  ]);

  return {
    dxy,
    us_10y: us10y,
    gold,
    sp500,
    fedwatch_rate: previousData?.fedwatch_rate ?? { current: null, isManual: true, source: "manual" },
  };
}

// Main function to fetch all data
export async function fetchAllData(previousData?: DashboardData): Promise<DashboardData> {
  const [cryptoMarket, fundFlow, macro] = await Promise.all([
    fetchCryptoMarket(),
    fetchFundFlow(previousData?.fund_flow),
    fetchMacro(previousData?.macro),
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
