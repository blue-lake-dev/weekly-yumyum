interface ChangeIndicatorProps {
  change: number;
  showEmoji?: boolean;
  decimals?: number;
}

export function ChangeIndicator({
  change,
  showEmoji = true,
  decimals = 2,
}: ChangeIndicatorProps) {
  const emoji = change > 0 ? "🟢" : change < 0 ? "🔴" : "⚪";
  const colorClass = change > 0 ? "text-up" : change < 0 ? "text-down" : "text-neutral";
  const sign = change > 0 ? "+" : "";

  return (
    <span className={`${colorClass} tabular-nums`}>
      {showEmoji && <span className="mr-1">{emoji}</span>}
      {sign}
      {change.toFixed(decimals)}%
    </span>
  );
}
