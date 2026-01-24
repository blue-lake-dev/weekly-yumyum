// RWA categories from rwa.xyz CSV (excluding Stablecoins)
const RWA_CATEGORIES = [
  "US Treasury Debt",
  "non-US Government Debt",
  "Corporate Bonds",
  "Private Credit",
  "Public Equity",
  "Private Equity",
  "Commodities",
  "Structured Credit",
  "Institutional Alternative Funds",
  "Actively-Managed Strategies",
] as const;

type RwaCategory = (typeof RWA_CATEGORIES)[number];

// Normalized keys for storage
const CATEGORY_KEYS: Record<RwaCategory, string> = {
  "US Treasury Debt": "treasuries",
  "non-US Government Debt": "non_us_gov_debt",
  "Corporate Bonds": "corporate_bonds",
  "Private Credit": "private_credit",
  "Public Equity": "public_equity",
  "Private Equity": "private_equity",
  "Commodities": "commodities",
  "Structured Credit": "structured_credit",
  "Institutional Alternative Funds": "alternative_funds",
  "Actively-Managed Strategies": "active_strategies",
};

export interface RwaDailyData {
  date: string; // "2026-01-23"
  total: number; // Sum of all categories (excl. Stablecoins)
  byCategory: Record<string, number>; // { treasuries: 9764943868, ... }
}

export interface RwaXyzData {
  latest: RwaDailyData | null;
  history: RwaDailyData[] | null; // Last N days if requested
  error?: string;
}

/**
 * Parse rwa.xyz CSV content (rwa-token-timeseries-export.csv)
 * Returns RWA by category, excluding Stablecoins
 */
export function parseRwaXyzCsv(csvContent: string, days: number = 7): RwaXyzData {
  try {
    const lines = csvContent.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV has no data rows");
    }

    // Parse header
    const header = lines[0].split(",");
    const categoryIndices: Record<string, number> = {};

    RWA_CATEGORIES.forEach((cat) => {
      const idx = header.findIndex((h) => h.trim() === cat);
      if (idx !== -1) {
        categoryIndices[cat] = idx;
      }
    });

    if (Object.keys(categoryIndices).length === 0) {
      throw new Error("Could not find RWA category columns in CSV");
    }

    // Find Date column
    const dateIdx = header.findIndex((h) => h.trim() === "Date");
    if (dateIdx === -1) {
      throw new Error("Could not find Date column");
    }

    // Parse data rows (newest first - CSV is chronological, so reverse)
    const dataRows = lines.slice(1).reverse();
    const history: RwaDailyData[] = [];

    for (const line of dataRows.slice(0, days)) {
      if (!line.trim()) continue;

      const values = parseCSVLine(line);
      const date = values[dateIdx]?.trim();
      if (!date) continue;

      const byCategory: Record<string, number> = {};
      let total = 0;

      for (const [cat, idx] of Object.entries(categoryIndices)) {
        const value = parseFloat(values[idx]) || 0;
        const key = CATEGORY_KEYS[cat as RwaCategory];
        byCategory[key] = value;
        total += value;
      }

      history.push({ date, total, byCategory });
    }

    if (history.length === 0) {
      throw new Error("No valid data rows found");
    }

    return {
      latest: history[0],
      history,
    };
  } catch (error) {
    console.error("parseRwaXyzCsv error:", error);
    return {
      latest: null,
      history: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Handle CSV values that might contain commas within quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}
