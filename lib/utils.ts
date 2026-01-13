/**
 * Format a number as currency (USD) with 2 decimal places
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (B for billions, M for millions)
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1) {
    // Already in billions
    return `$${value.toFixed(2)}B`;
  }
  // Convert to millions
  return `$${(value * 1000).toFixed(2)}M`;
}

/**
 * Format number with specified decimals
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format ratio (e.g., ETH/BTC)
 */
export function formatRatio(value: number): string {
  return value.toFixed(4);
}

/**
 * Get source label for display
 */
export function getSourceLabel(source?: string): string {
  const labels: Record<string, string> = {
    binance: "Binance",
    coingecko: "CoinGecko",
    alternative: "Alt.me",
    yahoo: "Yahoo",
    defillama: "DeFiLlama",
    manual: "Manual",
  };
  return source ? labels[source] || source : "";
}
