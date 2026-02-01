/**
 * Claude API - Daily market summary generator
 * Uses Claude Haiku for cost efficiency (~$0.01/day)
 * Requires ANTHROPIC_API_KEY env var
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  error?: { message: string };
}

export interface MarketDataForSummary {
  btcPrice: number;
  btcChange: number;
  ethPrice: number;
  ethChange: number;
  solPrice: number;
  solChange: number;
  btcDominance: number;
  fearGreed: number;
  fearGreedLabel: string;
  btcEtfFlow: number;
  ethEtfFlow: number;
  solEtfFlow: number;
  topGainer: string;
  topGainerPct: number;
}

export interface DailySummaryResult {
  summary: string | null;
  error?: string;
}

function getFearGreedLabel(value: number): string {
  if (value <= 25) return "극단적 공포";
  if (value <= 45) return "공포";
  if (value <= 55) return "중립";
  if (value <= 75) return "탐욕";
  return "극단적 탐욕";
}

function buildPrompt(data: MarketDataForSummary): string {
  return `Given today's crypto market data:
- BTC: $${data.btcPrice.toLocaleString()} (${data.btcChange >= 0 ? "+" : ""}${data.btcChange.toFixed(1)}%), Dominance: ${data.btcDominance.toFixed(1)}%
- ETH: $${data.ethPrice.toLocaleString()} (${data.ethChange >= 0 ? "+" : ""}${data.ethChange.toFixed(1)}%)
- SOL: $${data.solPrice.toLocaleString()} (${data.solChange >= 0 ? "+" : ""}${data.solChange.toFixed(1)}%)
- Fear & Greed: ${data.fearGreed} (${data.fearGreedLabel})
- ETF Flows: BTC ${data.btcEtfFlow >= 0 ? "+" : ""}$${data.btcEtfFlow.toFixed(1)}M, ETH ${data.ethEtfFlow >= 0 ? "+" : ""}$${data.ethEtfFlow.toFixed(1)}M, SOL ${data.solEtfFlow >= 0 ? "+" : ""}$${data.solEtfFlow.toFixed(1)}M
- Top Gainer: ${data.topGainer} +${data.topGainerPct.toFixed(1)}%

Write a 2-3 sentence Korean market summary for crypto traders.
Rules:
- Factual and concise
- No emojis in text
- No price predictions
- Casual tone (반말 OK)
- Focus on what's notable today`;
}

/**
 * Generate daily market summary using Claude Haiku
 */
export async function generateDailySummary(data: MarketDataForSummary): Promise<DailySummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error("[claude-summary] ANTHROPIC_API_KEY not set");
    return { summary: null, error: "ANTHROPIC_API_KEY not set" };
  }

  try {
    const prompt = buildPrompt(data);

    const response = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }] as ClaudeMessage[],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    const result: ClaudeResponse = await response.json();

    if (result.error) {
      throw new Error(result.error.message);
    }

    const summary = result.content?.[0]?.text?.trim() || null;

    if (summary) {
      console.log("[claude-summary] Generated:", summary.substring(0, 50) + "...");
    }

    return { summary };
  } catch (error) {
    console.error("[claude-summary] generateDailySummary error:", error);
    return {
      summary: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { getFearGreedLabel };
