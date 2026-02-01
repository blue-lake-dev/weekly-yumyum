interface StatPillProps {
  icon?: string;
  label: string;
  value: string | number;
  subLabel?: string;
  change?: number | null;
  changeType?: "percent" | "flow";
}

function formatChange(change: number | null | undefined, type: "percent" | "flow"): string {
  if (change === null || change === undefined) return "";
  const sign = change >= 0 ? "+" : "";
  if (type === "flow") {
    // Format as money flow (millions)
    return `${sign}$${Math.abs(change).toFixed(1)}M`;
  }
  // Format as percentage
  return `${sign}${change.toFixed(1)}%`;
}

export function StatPill({
  icon,
  label,
  value,
  subLabel,
  change,
  changeType = "percent",
}: StatPillProps) {
  const changeColor =
    change === null || change === undefined
      ? ""
      : change >= 0
        ? "text-[#16A34A]"
        : "text-[#DC2626]";

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E5E7EB] px-3 py-1.5 shadow-sm">
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-xs text-[#6B7280] font-medium">{label}</span>
      <span className="text-sm font-semibold text-[#171717] tabular-nums">
        {value}
      </span>
      {subLabel && (
        <span className="text-xs text-[#6B7280]">{subLabel}</span>
      )}
      {change !== null && change !== undefined && (
        <span className={`text-xs font-medium tabular-nums ${changeColor}`}>
          {formatChange(change, changeType)}
        </span>
      )}
    </div>
  );
}
