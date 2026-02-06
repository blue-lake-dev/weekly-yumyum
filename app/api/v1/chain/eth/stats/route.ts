import { NextResponse } from "next/server";
import { fetchCoinSupply } from "@/lib/fetchers/coingecko";
import { fetchEthStaking, fetchEthStakingRewards } from "@/lib/fetchers/beaconchain";
import { fetchEthBurnIssuance } from "@/lib/fetchers/ultrasound";

export const dynamic = "force-dynamic";

function aprToApy(apr: number, periodsPerYear: number): number {
  return Math.pow(1 + apr / periodsPerYear, periodsPerYear) - 1;
}

export async function GET() {
  try {
    const [supplyData, stakingData, stakingRewardsData, burnIssuanceData] =
      await Promise.all([
        fetchCoinSupply("ethereum"),
        fetchEthStaking(),
        fetchEthStakingRewards(),
        fetchEthBurnIssuance(),
      ]);

    const stakingRatio =
      stakingData.totalStaked && supplyData.circulatingSupply
        ? (stakingData.totalStaked / supplyData.circulatingSupply) * 100
        : null;

    const issuance7d = stakingRewardsData.issuance7d;
    const burn7d = burnIssuanceData.burn7d;
    const netSupplyChange7d =
      issuance7d && burn7d ? issuance7d - burn7d : null;
    const isDeflationary =
      netSupplyChange7d !== null ? netSupplyChange7d < 0 : null;

    return NextResponse.json({
      supply: {
        circulating: supplyData.circulatingSupply,
        totalBurnt: burnIssuanceData.burnTotal,
      },
      staking: {
        totalStaked: stakingData.totalStaked,
        validatorCount: stakingData.validatorCount,
        stakingRatio,
        apy: stakingRewardsData.apr
          ? aprToApy(stakingRewardsData.apr, 365)
          : null,
      },
      inflation: {
        issuance7d: stakingRewardsData.issuance7d,
        burn7d: burnIssuanceData.burn7d,
        netSupplyChange7d,
        supplyGrowthPct: burnIssuanceData.supplyGrowthRateYearly
          ? burnIssuanceData.supplyGrowthRateYearly * 100
          : null,
        isDeflationary,
      },
    });
  } catch (error) {
    console.error("[/api/v1/chain/eth/stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ETH stats" },
      { status: 500 }
    );
  }
}
