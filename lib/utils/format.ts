/**
 * Number formatting utilities for the dashboard
 */

/**
 * Format a number with compact notation (K, M, B, T)
 * @param value - The number to format
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "3.41T", "1.50B", "234.00M", "12.00K"
 */
export function formatCompactNumber(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(decimals)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(decimals)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(decimals)}K`;
  return `${sign}${abs.toFixed(decimals)}`;
}

/**
 * Format USD value with compact notation
 * @param value - USD amount (raw number, not pre-converted)
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "$1.50B", "$234.00M", "$12.00K"
 */
export function formatUsd(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";
  return `$${formatCompactNumber(value, decimals)}`;
}

/**
 * Format USD value with full number (no compact notation)
 * @param value - USD amount
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "$94,567.12", "$3,456.78"
 */
export function formatUsdFull(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format ETH amount with compact notation
 * @param value - ETH amount
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "5.10M", "234K", "1,234"
 */
export function formatEthAmount(
  value: number | null | undefined,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";

  if (value >= 1e6) return `${(value / 1e6).toFixed(decimals)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * Format flow values (ETF inflows/outflows) with sign and USD
 * @param value - Flow amount in millions
 * @param decimals - Decimal places (default: 0 for M, 2 for B)
 * @returns Formatted string like "+$1.47B", "-$234M"
 */
export function formatFlow(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";

  // Value is in millions, convert to billions if >= 1000M
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
  return `${sign}$${abs.toFixed(2)}M`;
}

/**
 * Format percentage with optional sign
 * @param value - Percentage value
 * @param showSign - Whether to show + for positive (default: true)
 * @param decimals - Decimal places (default: 2)
 * @returns Formatted string like "+12.50%", "-3.20%", "0.00%"
 */
export function formatPercent(
  value: number | null | undefined,
  showSign = true,
  decimals = 2
): string {
  if (value === null || value === undefined) return "—";

  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers for display (e.g., ETH supply)
 * Uses Korean 억 for values >= 1 billion, otherwise M
 * @param value - The number to format
 * @returns Formatted string like "1.21억", "234.5M"
 */
export function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";

  if (value >= 1e8) return `${(value / 1e8).toFixed(2)}억`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

/**
 * Format ratio values (e.g., ETH/BTC)
 * @param value - Ratio value
 * @param decimals - Decimal places (default: 4)
 * @returns Formatted string like "0.0335"
 */
export function formatRatio(
  value: number | null | undefined,
  decimals = 4
): string {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}
