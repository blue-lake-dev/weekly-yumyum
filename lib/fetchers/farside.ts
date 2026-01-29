import { launchBrowser } from "./browser";

// Parse flow value: "102.9" -> 102.9, "(107.7)" -> -107.7, "" -> 0
function parseFlowValue(value: string): number {
  if (!value || value.trim() === "" || value === "-") return 0;
  const cleaned = value.trim();
  // Parentheses indicate negative: (107.7) -> -107.7
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    return -parseFloat(cleaned.slice(1, -1)) || 0;
  }
  return parseFloat(cleaned) || 0;
}

export interface DailyFlow {
  date: string; // "2026-01-13"
  flows: Record<string, number>; // { ETHA: 53.3, FETH: 14.4, ... }
  total: number; // Sum of all flows
}

export interface EtfFlowsData {
  eth: DailyFlow[] | null;
  btc: DailyFlow[] | null;
  error?: string;
}

async function scrapeFarsidePage(
  url: string,
  days: number = 7
): Promise<DailyFlow[]> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");

      for (const table of tables) {
        const rows = table.querySelectorAll("tr");
        if (rows.length < 5) continue;

        const headers: string[] = [];
        const dataRows: { date: string; values: string[] }[] = [];

        rows.forEach((row, i) => {
          const cells = row.querySelectorAll("th, td");
          const cellValues = Array.from(cells).map(
            (c) => c.textContent?.trim() || ""
          );

          // Header row detection
          if (
            i <= 1 &&
            cellValues.some(
              (v) =>
                v.includes("ETHA") ||
                v.includes("IBIT") ||
                v.includes("FETH") ||
                v.includes("FBTC")
            )
          ) {
            headers.push(...cellValues);
          }

          // Data row - starts with date pattern
          if (
            cellValues[0] &&
            /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(
              cellValues[0]
            )
          ) {
            dataRows.push({ date: cellValues[0], values: cellValues.slice(1) });
          }
        });

        if (headers.length > 0 && dataRows.length > 0) {
          return { headers, dataRows };
        }
      }
      return null;
    });

    if (!data) {
      throw new Error("Could not find ETF data table");
    }

    // Parse headers to get ticker names (skip empty ones)
    const tickers = data.headers.filter(
      (h) => h && h !== "" && h !== "Total" && !h.includes("Total")
    );

    // Parse data rows (table is oldest→newest, so take last N rows for most recent)
    const results: DailyFlow[] = [];
    const recentRows = data.dataRows.slice(-days).reverse(); // Most recent first

    for (const row of recentRows) {
      // Skip rows where all values are "-" (no data for that day)
      const hasRealData = row.values.some(
        (v) => v && v.trim() !== "" && v.trim() !== "-"
      );
      if (!hasRealData) continue;

      // Parse date: "13 Jan 2026" -> "2026-01-13"
      const dateMatch = row.date.match(
        /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i
      );
      if (!dateMatch) continue;

      const [, day, monthStr, year] = dateMatch;
      const monthMap: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
      };
      const month = monthMap[monthStr.toLowerCase()];
      const isoDate = `${year}-${month}-${day.padStart(2, "0")}`;

      // Map values to tickers
      const flows: Record<string, number> = {};
      let total = 0;
      let hasNonZeroValue = false;

      tickers.forEach((ticker, i) => {
        const rawValue = row.values[i] || "";
        const value = parseFlowValue(rawValue);
        if (ticker && ticker !== "Total") {
          flows[ticker] = value;
          total += value;
          // Track if we have any actual non-zero value (not just "-" parsed as 0)
          if (rawValue.trim() !== "-" && rawValue.trim() !== "" && value !== 0) {
            hasNonZeroValue = true;
          }
        }
      });

      // Skip rows where all values were "-" (parsed as 0) - no real data for that day
      // A legitimate 0 total would have at least some non-zero individual flows
      if (total === 0 && !hasNonZeroValue) continue;

      results.push({ date: isoDate, flows, total });
    }

    return results;
  } finally {
    await browser.close();
  }
}

export interface EtfHoldingsData {
  ethTotal: number | null; // Total ETH held by all ETFs
  btcTotal: number | null; // Total BTC held by all ETFs (for reference)
  error?: string;
}

async function scrapeEtfHoldings(url: string): Promise<number | null> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Find the "Total" row and extract the last cell (total holdings)
    const total = await page.evaluate(() => {
      const tables = document.querySelectorAll("table");

      for (const table of tables) {
        const rows = table.querySelectorAll("tr");

        for (const row of rows) {
          const cells = row.querySelectorAll("th, td");
          const firstCell = cells[0]?.textContent?.trim() || "";

          // Look for the "Total" row
          if (firstCell.toLowerCase() === "total") {
            // Get the last cell value (cumulative total)
            const lastCell = cells[cells.length - 1]?.textContent?.trim() || "";
            // Parse: "3,607,680" or "3607680" -> number
            const cleaned = lastCell.replace(/,/g, "");
            return parseFloat(cleaned) || null;
          }
        }
      }
      return null;
    });

    return total;
  } finally {
    await browser.close();
  }
}

/**
 * Fetch total ETF holdings (ETH and BTC) from Farside
 * This extracts the "Total" row which shows cumulative holdings
 */
export async function fetchEtfHoldings(): Promise<EtfHoldingsData> {
  try {
    const [ethTotal, btcTotal] = await Promise.all([
      scrapeEtfHoldings("https://farside.co.uk/eth/"),
      scrapeEtfHoldings("https://farside.co.uk/btc/"),
    ]);

    return { ethTotal, btcTotal };
  } catch (error) {
    console.error("fetchEtfHoldings error:", error);
    return {
      ethTotal: null,
      btcTotal: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchEtfFlows(days: number = 7): Promise<EtfFlowsData> {
  try {
    const [eth, btc] = await Promise.all([
      scrapeFarsidePage("https://farside.co.uk/eth/", days),
      scrapeFarsidePage("https://farside.co.uk/btc/", days),
    ]);

    return { eth, btc };
  } catch (error) {
    console.error("fetchEtfFlows error:", error);
    return {
      eth: null,
      btc: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
