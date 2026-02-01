"use client";

import { StatPill } from "@/components/ui/StatPill";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickStats } from "@/lib/hooks/use-quick-stats";
import { formatFlow } from "@/lib/utils/format";

function getFearGreedEmoji(value: number | null): string {
  if (value === null) return "😐";
  if (value <= 25) return "😨";
  if (value <= 45) return "😟";
  if (value <= 55) return "😐";
  if (value <= 75) return "😊";
  return "🤑";
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
          value={data.stablecoins.total !== null ? `$${data.stablecoins.total.toFixed(2)}B` : "—"}
        />

        {/* BTC ETF Flow */}
        <StatPill
          icon="₿"
          label="ETF BTC"
          value={formatFlow(data.etfFlows.btc)}
          valueColor={data.etfFlows.btc === null ? "neutral" : data.etfFlows.btc >= 0 ? "positive" : "negative"}
        />

        {/* ETH ETF Flow */}
        <StatPill
          icon="Ξ"
          label="ETF ETH"
          value={formatFlow(data.etfFlows.eth)}
          valueColor={data.etfFlows.eth === null ? "neutral" : data.etfFlows.eth >= 0 ? "positive" : "negative"}
        />

        {/* SOL ETF Flow */}
        <StatPill
          icon="◎"
          label="ETF SOL"
          value={formatFlow(data.etfFlows.sol)}
          valueColor={data.etfFlows.sol === null ? "neutral" : data.etfFlows.sol >= 0 ? "positive" : "negative"}
        />
      </div>
    </section>
  );
}
