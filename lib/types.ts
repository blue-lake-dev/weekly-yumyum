export interface MetricValue {
  current: number;
  previous?: number;
  change_pct?: number;
}

export interface StringMetricValue {
  current: string;
  previous?: string;
}

export interface CryptoMarket {
  btc_price: MetricValue;
  eth_price: MetricValue;
  btc_dominance: MetricValue;
  btc_gold_ratio: MetricValue;
  eth_btc_ratio: MetricValue;
  fear_greed: MetricValue;
  vol_7d: MetricValue;
  vol_30d: MetricValue;
  nasdaq: MetricValue;
  mstr: MetricValue;
  bmnr: MetricValue;
  cme_gap: MetricValue;
}

export interface FundFlow {
  btc_etf_flow: MetricValue;
  eth_etf_flow: MetricValue;
  stablecoin_supply: MetricValue;
  stablecoin_by_chain: Record<string, MetricValue>;
  cex_flow_btc: MetricValue;
  cex_flow_eth: MetricValue;
  miner_breakeven: MetricValue;
  aave_borrow: MetricValue;
  btc_oi: MetricValue;
  long_short_ratio: MetricValue;
  funding_rate: MetricValue;
}

export interface Macro {
  dxy: MetricValue;
  us_10y: MetricValue;
  gold: MetricValue;
  sp500: MetricValue;
  fedwatch_rate: StringMetricValue;
}

export interface DashboardData {
  updated_at: string;
  crypto_market: CryptoMarket;
  fund_flow: FundFlow;
  macro: Macro;
}
