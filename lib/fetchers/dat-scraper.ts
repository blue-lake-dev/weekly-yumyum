import { launchBrowser } from "./browser";

export interface DatCompany {
  name: string;
  holdings: number; // Token amount (ETH or SOL)
  holdingsUsd: number;
  supplyPct: number;
}

export interface DatHoldingsData {
  totalHoldings: number | null; // Token amount (ETH or SOL)
  totalUsd: number | null;
  supplyPct: number | null;
  companies: DatCompany[] | null;
  error?: string;
}

// Legacy interface for backwards compatibility
export interface EthDatHoldingsData {
  totalEth: number | null;
  totalUsd: number | null;
  supplyPct: number | null;
  companies: DatCompany[] | null;
  error?: string;
}

// Parse values like "6.01m" -> 6010000, "4.2m" -> 4200000
function parseHoldingsValue(value: string): number {
  const cleaned = value.toLowerCase().replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)([mk])?/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "m") return num * 1_000_000;
  if (suffix === "k") return num * 1_000;
  return num;
}

// Parse USD values like "$17.97b" -> 17970000000
function parseUsdValue(value: string): number {
  const cleaned = value.toLowerCase().replace(/[$,]/g, "").trim();
  const match = cleaned.match(/^([\d.]+)([bm])?/);
  if (!match) return 0;

  const num = parseFloat(match[1]);
  const suffix = match[2];

  if (suffix === "b") return num * 1_000_000_000;
  if (suffix === "m") return num * 1_000_000;
  return num;
}

// Parse percentage like "4.977%" -> 4.977
function parsePct(value: string): number {
  const match = value.match(/([\d.]+)%?/);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Scrape DAT (Digital Asset Treasury) holdings from DeFiLlama
 * This fetches corporate/institutional holdings (not DAO treasuries)
 *
 * @param chain - "ethereum" or "solana"
 */
export async function fetchDatHoldingsByChain(
  chain: "ethereum" | "solana"
): Promise<DatHoldingsData> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = `https://defillama.com/digital-asset-treasuries/${chain}`;
    console.log(`[dat-scraper] Navigating to ${url}...`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 3000));

    console.log("[dat-scraper] Page loaded, extracting data...");

    const data = await page.evaluate(() => {
      // Extract summary stats from paragraphs
      const paragraphs = document.querySelectorAll("main p");
      let totalHoldings = "";
      let totalUsdValue = "";
      let circulatingSupplyPct = "";

      paragraphs.forEach((p) => {
        const text = p.textContent?.trim() || "";
        if (text.startsWith("Total Holdings")) {
          totalHoldings = text.replace("Total Holdings", "").trim();
        } else if (text.startsWith("Total USD Value")) {
          totalUsdValue = text.replace("Total USD Value", "").trim();
        } else if (text.includes("Circulating Supply")) {
          const match = text.match(/([\d.]+)%\s*$/);
          circulatingSupplyPct = match ? match[1] + "%" : "";
        }
      });

      // Extract institution data
      interface RawCompany {
        name: string;
        holdings: string;
        holdingsUsd: string;
        supplyPct: string;
      }
      const companies: RawCompany[] = [];

      const mainEl = document.querySelector("main");
      if (!mainEl) {
        return { totalHoldings, totalUsdValue, circulatingSupplyPct, companies };
      }

      const links = mainEl.querySelectorAll('a[href^="/digital-asset-treasury/"]');

      links.forEach((link) => {
        const name = link.textContent?.trim() || "";
        if (!name) return;

        let rowEl = link.closest("div") || link.parentElement;

        for (let i = 0; i < 5 && rowEl; i++) {
          const text = rowEl.textContent || "";

          // Check for ETH or SOL token
          const hasToken = text.includes("ETH") || text.includes("SOL");
          if (text.includes(name) && hasToken && text.includes("%")) {
            const afterName = text.substring(text.indexOf(name) + name.length);

            // Match holdings for ETH or SOL
            const holdingsMatch = afterName.match(/^\s*([\d,]+\.?\d*[mk]?)\s*(ETH|SOL)/i);
            const usdMatch = afterName.match(/\$([\d.]+[bm])/i);
            const supplyMatch = afterName.match(/\$[\d.]+\s+([\d.]+)%/);

            if (holdingsMatch && usdMatch) {
              companies.push({
                name,
                holdings: holdingsMatch[1] + " " + holdingsMatch[2].toUpperCase(),
                holdingsUsd: "$" + usdMatch[1],
                supplyPct: supplyMatch ? supplyMatch[1] + "%" : "",
              });
              return;
            }
          }

          rowEl = rowEl.parentElement;
        }
      });

      return { totalHoldings, totalUsdValue, circulatingSupplyPct, companies };
    });

    // Parse the scraped data
    const totalHoldings = parseHoldingsValue(data.totalHoldings);
    const totalUsd = parseUsdValue(data.totalUsdValue);
    const supplyPct = parsePct(data.circulatingSupplyPct);

    const companies: DatCompany[] = data.companies.map((c) => ({
      name: c.name,
      holdings: parseHoldingsValue(c.holdings),
      holdingsUsd: parseUsdValue(c.holdingsUsd),
      supplyPct: parsePct(c.supplyPct),
    }));

    // Sort companies by holdings (descending)
    companies.sort((a, b) => b.holdings - a.holdings);

    const tokenSymbol = chain === "ethereum" ? "ETH" : "SOL";
    console.log(`[dat-scraper] Extracted: ${totalHoldings} ${tokenSymbol}, $${totalUsd}, ${supplyPct}%, ${companies.length} companies`);

    return {
      totalHoldings: totalHoldings || null,
      totalUsd: totalUsd || null,
      supplyPct: supplyPct || null,
      companies: companies.length > 0 ? companies : null,
    };
  } catch (error) {
    console.error("[dat-scraper] Error:", error);
    return {
      totalHoldings: null,
      totalUsd: null,
      supplyPct: null,
      companies: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await browser.close();
  }
}

/**
 * Fetch ETH DAT holdings (legacy wrapper for backwards compatibility)
 */
export async function fetchDatHoldings(): Promise<EthDatHoldingsData> {
  const data = await fetchDatHoldingsByChain("ethereum");
  return {
    totalEth: data.totalHoldings,
    totalUsd: data.totalUsd,
    supplyPct: data.supplyPct,
    companies: data.companies,
    error: data.error,
  };
}

/**
 * Fetch SOL DAT holdings
 */
export async function fetchSolDatHoldings(): Promise<DatHoldingsData> {
  return fetchDatHoldingsByChain("solana");
}
