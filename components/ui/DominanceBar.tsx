interface DominanceBarProps {
  btc: number | null;
  eth: number | null;
  others: number | null;
}

/**
 * Horizontal segmented bar showing market dominance
 * BTC (orange) | ETH (blue) | Others (gray)
 */
export function DominanceBar({ btc, eth, others }: DominanceBarProps) {
  // Default to 0 if null
  const btcPct = btc ?? 0;
  const ethPct = eth ?? 0;
  const othersPct = others ?? 0;

  // If all are 0, show empty state
  const total = btcPct + ethPct + othersPct;
  if (total === 0) {
    return (
      <div className="h-2 w-full rounded-full bg-[#E5E7EB]" />
    );
  }

  return (
    <div className="h-2 w-full rounded-full overflow-hidden flex">
      {/* BTC segment - orange */}
      {btcPct > 0 && (
        <div
          className="h-full bg-[#F7931A]"
          style={{ width: `${btcPct}%` }}
        />
      )}
      {/* ETH segment - blue */}
      {ethPct > 0 && (
        <div
          className="h-full bg-[#627EEA]"
          style={{ width: `${ethPct}%` }}
        />
      )}
      {/* Others segment - gray */}
      {othersPct > 0 && (
        <div
          className="h-full bg-[#9CA3AF]"
          style={{ width: `${othersPct}%` }}
        />
      )}
    </div>
  );
}
