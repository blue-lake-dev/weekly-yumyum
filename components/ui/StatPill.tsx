interface StatPillProps {
  icon?: string;
  label: string;
  value: string | number;
  subLabel?: string;
  valueColor?: "positive" | "negative" | "neutral";
}

export function StatPill({
  icon,
  label,
  value,
  subLabel,
  valueColor = "neutral",
}: StatPillProps) {
  const colorClass =
    valueColor === "positive"
      ? "text-[#16A34A]"
      : valueColor === "negative"
        ? "text-[#DC2626]"
        : "text-[#171717]";

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#E5E7EB] px-3 py-1.5 shadow-sm">
      {icon && <span className="text-base">{icon}</span>}
      <span className="text-xs text-[#6B7280] font-medium">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${colorClass}`}>
        {value}
      </span>
      {subLabel && (
        <span className="text-xs text-[#6B7280]">{subLabel}</span>
      )}
    </div>
  );
}
