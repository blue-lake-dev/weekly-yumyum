"use client";

interface DerivativeItem {
  longPct: number;
  shortPct: number;
  fundingRatePct: string;
}

interface DerivativesData {
  btc: DerivativeItem | null;
  eth: DerivativeItem | null;
  sol: DerivativeItem | null;
}

interface DerivativesProps {
  data: DerivativesData | null;
}

const symbols = [
  { key: "btc" as const, label: "BTC", icon: "₿" },
  { key: "eth" as const, label: "ETH", icon: "Ξ" },
  { key: "sol" as const, label: "SOL", icon: "◎" },
];

export function Derivatives({ data }: DerivativesProps) {
  if (!data) {
    return (
      <div className="py-4 text-center text-sm text-[#9CA3AF]">
        데이터 없음
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center text-xs text-[#6B7280] font-medium">
        <div className="w-16" />
        <div className="flex-1 text-center">롱/숏 비율</div>
        <div className="w-24 text-right">펀딩비 (8h)</div>
      </div>

      {/* Rows */}
      {symbols.map(({ key, label, icon }) => {
        const item = data[key];
        if (!item) {
          return (
            <div key={key} className="flex items-center">
              <div className="w-16 flex items-center gap-1 font-medium text-[#171717]">
                <span>{icon}</span>
                <span>{label}</span>
              </div>
              <div className="flex-1 text-center text-sm text-[#9CA3AF]">데이터 없음</div>
              <div className="w-24" />
            </div>
          );
        }

        const fundingColor = parseFloat(item.fundingRatePct) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]";

        return (
          <div key={key} className="flex items-center gap-2">
            {/* Symbol */}
            <div className="w-16 flex items-center gap-1 font-medium text-[#171717]">
              <span>{icon}</span>
              <span>{label}</span>
            </div>

            {/* Long/Short Bar */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#16A34A] w-8">🐂</span>
                <div className="flex-1 h-4 bg-[#FEE2E2] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full transition-all"
                    style={{ width: `${item.longPct}%` }}
                  />
                </div>
                <span className="text-xs text-[#DC2626] w-8 text-right">🐻</span>
              </div>
              <div className="flex justify-between text-xs text-[#6B7280] mt-0.5">
                <span>{item.longPct}%</span>
                <span>{item.shortPct}%</span>
              </div>
            </div>

            {/* Funding Rate */}
            <div className={`w-24 text-right text-sm font-medium tabular-nums ${fundingColor}`}>
              {parseFloat(item.fundingRatePct) >= 0 ? "+" : ""}{item.fundingRatePct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
