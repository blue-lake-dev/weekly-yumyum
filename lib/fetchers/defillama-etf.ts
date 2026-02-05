import { launchBrowser } from "./browser";

export interface EtfHolding {
  ticker: string;
  issuer: string;
  coin: string; // "solana", "ethereum", "bitcoin"
  flows: number | null; // Daily flows in USD
  aum: number | null; // AUM in USD
}

export interface EtfHoldingsData {
  holdings: EtfHolding[] | null;
  totalAum: number | null;
  error?: string;
}

// Raw ETF data from DeFiLlama's __NEXT_DATA__
interface RawEtfData {
  ticker: string;
  issuer: string;
  asset: string; // "bitcoin", "ethereum", "solana"
  flows: number;
  aum: number;
  volume: number;
  etf_name?: string;
  pct_fee?: number;
}

/**
 * Fetch ETF holdings from DeFiLlama by extracting __NEXT_DATA__ JSON
 * URL: https://defillama.com/etfs
 *
 * @param asset - Filter by asset: "solana", "ethereum", "bitcoin", or undefined for all
 */
export async function fetchEtfHoldingsFromDeFiLlama(
  asset?: "solana" | "ethereum" | "bitcoin"
): Promise<EtfHoldingsData> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = "https://defillama.com/etfs";
    console.log(`[defillama-etf] Navigating to ${url}...`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    console.log("[defillama-etf] Page loaded, extracting __NEXT_DATA__...");

    // Extract data from __NEXT_DATA__ script tag
    const rawData = await page.evaluate(() => {
      const script = document.getElementById("__NEXT_DATA__");
      if (!script) return null;
      try {
        const json = JSON.parse(script.textContent || "");
        return json?.props?.pageProps?.snapshot || null;
      } catch {
        return null;
      }
    });

    if (!rawData || !Array.isArray(rawData)) {
      throw new Error("Could not extract ETF data from page");
    }

    console.log(`[defillama-etf] Found ${rawData.length} total ETFs`);

    // Parse and filter
    const allHoldings: EtfHolding[] = (rawData as RawEtfData[]).map((e) => ({
      ticker: e.ticker,
      issuer: e.issuer,
      coin: e.asset,
      flows: e.flows || null,
      aum: e.aum || null,
    }));

    // Filter by asset if specified
    const filtered = asset
      ? allHoldings.filter((h) => h.coin === asset)
      : allHoldings;

    // Sort by AUM descending
    filtered.sort((a, b) => (b.aum ?? 0) - (a.aum ?? 0));

    // Calculate total AUM
    const totalAum = filtered.reduce((sum, h) => sum + (h.aum ?? 0), 0);

    console.log(
      `[defillama-etf] Extracted ${filtered.length} ETFs${asset ? ` for ${asset}` : ""}, total AUM: $${(totalAum / 1e6).toFixed(2)}M`
    );

    return {
      holdings: filtered.length > 0 ? filtered : null,
      totalAum: totalAum > 0 ? totalAum : null,
    };
  } catch (error) {
    console.error("[defillama-etf] Error:", error);
    return {
      holdings: null,
      totalAum: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await browser.close();
  }
}

/**
 * Fetch SOL ETF holdings from DeFiLlama
 */
export async function fetchSolEtfHoldings(): Promise<EtfHoldingsData> {
  return fetchEtfHoldingsFromDeFiLlama("solana");
}

/**
 * Fetch ETH ETF holdings from DeFiLlama
 */
export async function fetchEthEtfHoldingsFromDeFiLlama(): Promise<EtfHoldingsData> {
  return fetchEtfHoldingsFromDeFiLlama("ethereum");
}

/**
 * Fetch BTC ETF holdings from DeFiLlama
 */
export async function fetchBtcEtfHoldingsFromDeFiLlama(): Promise<EtfHoldingsData> {
  return fetchEtfHoldingsFromDeFiLlama("bitcoin");
}
