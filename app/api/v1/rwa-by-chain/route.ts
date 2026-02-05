import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFILLAMA_API = "https://api.llama.fi";

// Chain colors (brand colors)
const CHAIN_COLORS: Record<string, string> = {
  Ethereum: "#627EEA",
  Binance: "#F3BA2F",
  Solana: "#9945FF",
  Aptos: "#4ECDC4",
  Arbitrum: "#28A0F0",
  Avalanche: "#E84142",
  Polygon: "#8247E5",
  Stellar: "#000000",
  "zkSync Era": "#8C8DFC",
  "Plume Mainnet": "#6366F1",
  Base: "#0052FF",
  Optimism: "#FF0420",
  Tron: "#FF0013",
  Others: "#9CA3AF",
};

// Excluded chain suffixes (staking, borrowed, pool2 are separate metrics)
const EXCLUDED_SUFFIXES = ["-staking", "-borrowed", "-pool2"];

interface Protocol {
  category: string;
  chainTvls: Record<string, number>;
}

export async function GET() {
  try {
    const res = await fetch(`${DEFILLAMA_API}/protocols`, {
      next: { revalidate: 900 }, // 15 min cache
    });

    if (!res.ok) throw new Error("Failed to fetch protocols");

    const protocols: Protocol[] = await res.json();

    // Filter RWA category and aggregate by chain
    const byChain: Record<string, number> = {};
    let total = 0;

    for (const protocol of protocols) {
      if (protocol.category !== "RWA") continue;

      const chainTvls = protocol.chainTvls || {};

      for (const [chain, tvl] of Object.entries(chainTvls)) {
        // Skip staking/borrowed/pool2 entries
        if (EXCLUDED_SUFFIXES.some((suffix) => chain.endsWith(suffix))) continue;

        byChain[chain] = (byChain[chain] || 0) + tvl;
        total += tvl;
      }
    }

    // Sort by TVL descending
    const sorted = Object.entries(byChain).sort((a, b) => b[1] - a[1]);

    // Get top 5 chains + aggregate others
    const top5 = sorted.slice(0, 5);
    const othersTotal = sorted.slice(5).reduce((sum, [, val]) => sum + val, 0);

    const chains = [
      ...top5.map(([name, value]) => ({
        name,
        value,
        color: CHAIN_COLORS[name] || "#9CA3AF",
      })),
      {
        name: "Others",
        value: othersTotal,
        color: CHAIN_COLORS.Others,
      },
    ];

    // Calculate percentages (relative to max for bar width)
    const maxValue = Math.max(...chains.map((c) => c.value));

    return NextResponse.json({
      total,
      chains: chains.map((c) => ({
        ...c,
        percent: (c.value / maxValue) * 100, // For bar width (relative to max)
        share: (c.value / total) * 100, // Actual share of total
      })),
    });
  } catch (error) {
    console.error("[rwa-by-chain] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
