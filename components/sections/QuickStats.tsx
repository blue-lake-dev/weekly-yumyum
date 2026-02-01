"use client";

import { StatPill } from "@/components/ui/StatPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickStats } from "@/lib/hooks/use-quick-stats";

function getFearGreedEmoji(value: number | null): string {
  if (value === null) return "😐";
  if (value <= 25) return "😨";
  if (value <= 45) return "😟";
  if (value <= 55) return "😐";
  if (value <= 75) return "😊";
  return "🤑";
}

function formatBillions(value: number | null): string {
  if (value === null) return "—";
  return `$${(value / 1e9).toFixed(0)}B`;
}

function formatFlow(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(1)}M`;
}

export function QuickStats() {
  const { data, isLoading } = useQuickStats();

  if (isLoading || !data) {
    return (
      <section className="mb-6">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex flex-wrap gap-2">
        {/* Fear & Greed */}
        <StatPill
          icon={getFearGreedEmoji(data.fearGreed.value)}
          label="F&G"
          value={data.fearGreed.value ?? "—"}
          subLabel={data.fearGreed.label}
        />

        {/* BTC Dominance */}
        <StatPill
          icon="₿"
          label="BTC.D"
          value={data.dominance.btc !== null ? `${data.dominance.btc.toFixed(1)}%` : "—"}
        />

        {/* Stablecoins */}
        <StatPill
          icon="💵"
          label="Stables"
          value={formatBillions(data.stablecoins.total)}
        />

        {/* BTC ETF Flow */}
        <StatPill
          icon="₿"
          label="BTC ETF"
          value={formatFlow(data.etfFlows.btc)}
          change={data.etfFlows.btc}
          changeType="flow"
        />

        {/* ETH ETF Flow */}
        <StatPill
          icon="Ξ"
          label="ETH ETF"
          value={formatFlow(data.etfFlows.eth)}
          change={data.etfFlows.eth}
          changeType="flow"
        />

        {/* SOL ETF Flow */}
        <StatPill
          icon="◎"
          label="SOL ETF"
          value={formatFlow(data.etfFlows.sol)}
          change={data.etfFlows.sol}
          changeType="flow"
        />
      </div>
    </section>
  );
}
