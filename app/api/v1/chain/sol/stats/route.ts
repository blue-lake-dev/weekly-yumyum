import { NextResponse } from "next/server";
import { fetchSolanaSupply, fetchSolanaInflation } from "@/lib/fetchers/solana";

export const dynamic = "force-dynamic";

function aprToApy(apr: number, periodsPerYear: number): number {
  return Math.pow(1 + apr / periodsPerYear, periodsPerYear) - 1;
}

export async function GET() {
  try {
    const [supplyData, inflationData] = await Promise.all([
      fetchSolanaSupply(),
      fetchSolanaInflation(),
    ]);

    // Calculate staking APR from inflation: APR = inflation_rate × (total_supply / staked_amount)
    // Then convert to APY with ~150 epochs/year compounding
    const stakingApr =
      inflationData.annualRatePct && supplyData.totalSupply && supplyData.stakedAmount
        ? (inflationData.annualRatePct / 100) * (supplyData.totalSupply / supplyData.stakedAmount)
        : null;
    const stakingApy = stakingApr ? aprToApy(stakingApr, 150) : null;

    return NextResponse.json({
      supply: {
        total: supplyData.totalSupply,
        circulating: supplyData.circulatingSupply,
      },
      staking: {
        staked: supplyData.stakedAmount,
        stakingPct: supplyData.stakingPct,
        apy: stakingApy,
      },
      inflation: {
        annualRatePct: inflationData.annualRatePct,
        epoch: inflationData.epoch,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/sol/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SOL stats" },
      { status: 500 }
    );
  }
}
