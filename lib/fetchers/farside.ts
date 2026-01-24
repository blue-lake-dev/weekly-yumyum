import puppeteer from "puppeteer";

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
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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

    // Parse data rows
    const results: DailyFlow[] = [];

    for (const row of data.dataRows.slice(0, days)) {
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

      tickers.forEach((ticker, i) => {
        const value = parseFlowValue(row.values[i] || "");
        if (ticker && ticker !== "Total") {
          flows[ticker] = value;
          total += value;
        }
      });

      results.push({ date: isoDate, flows, total });
    }

    return results;
  } finally {
    await browser.close();
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
