/**
 * MacroMicro scraper for BTC mining cost data
 *
 * Scrapes: https://en.macromicro.me/charts/29435/bitcoin-production-total-cost
 * This is a Puppeteer scraper that runs weekly via cron job
 * Data is stored in Supabase for quick retrieval
 */

import { launchBrowser } from "./browser";

export interface MiningCostData {
  productionCost: number | null;  // USD per BTC
  scrapedAt: string;
  error?: string;
}

/**
 * Scrape BTC mining production cost from MacroMicro
 *
 * Note: This is an expensive operation (Puppeteer) and should be run
 * weekly via cron job, with results stored in Supabase.
 */
export async function fetchBtcMiningCost(): Promise<MiningCostData> {
  const scrapedAt = new Date().toISOString();
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const url = "https://en.macromicro.me/charts/29435/bitcoin-production-total-cost";
    console.log(`[macromicro] Navigating to ${url}...`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait for chart to render
    await new Promise((r) => setTimeout(r, 5000));

    console.log("[macromicro] Page loaded, extracting mining cost...");

    // Try to extract the latest value from the chart
    // MacroMicro stores data in chart tooltips and data-value attributes
    const data = await page.evaluate(() => {
      // Method 1: Look for the latest value in the chart legend/stats
      const statsElements = document.querySelectorAll('[class*="stat"], [class*="value"], [class*="legend"]');
      for (const el of statsElements) {
        const text = el.textContent?.trim() || "";
        // Look for patterns like "85,234" or "$85,234" or "85234"
        const match = text.match(/\$?([\d,]+(?:\.\d+)?)/);
        if (match) {
          const value = parseFloat(match[1].replace(/,/g, ""));
          // Mining cost is typically between $10,000 and $200,000
          if (value >= 10000 && value <= 200000) {
            return { value, source: "stats" };
          }
        }
      }

      // Method 2: Look for the chart's data points in the page
      // MacroMicro often has a JSON data structure in the page
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const content = script.textContent || "";
        // Look for chart data patterns
        if (content.includes("chartData") || content.includes("seriesData")) {
          // Try to extract the last value from any arrays
          const arrayMatches = content.match(/\[[\d,.\s]+\]/g);
          if (arrayMatches) {
            for (const arrayStr of arrayMatches) {
              try {
                const arr = JSON.parse(arrayStr);
                if (Array.isArray(arr) && arr.length > 0) {
                  const lastValue = arr[arr.length - 1];
                  if (typeof lastValue === "number" && lastValue >= 10000 && lastValue <= 200000) {
                    return { value: lastValue, source: "script-array" };
                  }
                }
              } catch {
                continue;
              }
            }
          }
        }
      }

      // Method 3: Look for specific chart container text
      const chartContainers = document.querySelectorAll('[class*="chart"], [class*="highcharts"]');
      for (const container of chartContainers) {
        const text = container.textContent || "";
        // Look for cost-like values
        const matches = text.match(/(\d{2,3},?\d{3})/g);
        if (matches) {
          for (const match of matches) {
            const value = parseFloat(match.replace(/,/g, ""));
            if (value >= 10000 && value <= 200000) {
              return { value, source: "chart-container" };
            }
          }
        }
      }

      return { value: null, source: "not-found" };
    });

    if (data.value) {
      console.log(`[macromicro] Mining cost: $${data.value.toLocaleString()} (source: ${data.source})`);
      return {
        productionCost: data.value,
        scrapedAt,
      };
    }

    // If we couldn't find the value, try hovering over the chart
    // to trigger tooltip and get the latest value
    console.log("[macromicro] Trying hover method...");

    const chartArea = await page.$('[class*="chart"], [class*="highcharts"]');
    if (chartArea) {
      const box = await chartArea.boundingBox();
      if (box) {
        // Hover on the right side (latest data point)
        await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
        await new Promise((r) => setTimeout(r, 1000));

        // Try to extract tooltip value
        const tooltipValue = await page.evaluate(() => {
          const tooltip = document.querySelector('[class*="tooltip"]');
          if (tooltip) {
            const text = tooltip.textContent || "";
            const match = text.match(/\$?([\d,]+(?:\.\d+)?)/);
            if (match) {
              const value = parseFloat(match[1].replace(/,/g, ""));
              if (value >= 10000 && value <= 200000) {
                return value;
              }
            }
          }
          return null;
        });

        if (tooltipValue) {
          console.log(`[macromicro] Mining cost from tooltip: $${tooltipValue.toLocaleString()}`);
          return {
            productionCost: tooltipValue,
            scrapedAt,
          };
        }
      }
    }

    console.log("[macromicro] Could not extract mining cost");
    return {
      productionCost: null,
      scrapedAt,
      error: "Could not find mining cost value on page",
    };
  } catch (error) {
    console.error("[macromicro] Error:", error);
    return {
      productionCost: null,
      scrapedAt,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await browser.close();
  }
}
