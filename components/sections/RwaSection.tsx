"use client";

interface RwaData {
  total: number | null;
  byChain: Record<string, number>;
}

interface RwaSectionProps {
  data: RwaData | null;
}

function formatBillions(value: number | null): string {
  if (value === null) return "—";
  return `$${(value / 1e9).toFixed(2)}B`;
}

export function RwaSection({ data }: RwaSectionProps) {
  if (!data) {
    return (
      <div className="py-4 text-center text-sm text-[#9CA3AF]">
        데이터 없음
      </div>
    );
  }

  // Sort chains by value descending
  const chains = Object.entries(data.byChain)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxValue = chains[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      {/* Total */}
      <div>
        <p className="text-xs text-[#6B7280] mb-1">RWA 총액 (스테이블코인 제외)</p>
        <p className="text-2xl font-bold text-[#171717] tabular-nums">
          {formatBillions(data.total)}
        </p>
      </div>

      {/* Chain Breakdown */}
      <div>
        <p className="text-xs text-[#6B7280] mb-2">체인별 RWA</p>
        <div className="space-y-2">
          {chains.map(([chain, value]) => {
            const pct = (value / maxValue) * 100;
            return (
              <div key={chain} className="flex items-center gap-2">
                <span className="w-20 text-sm font-medium text-[#171717] truncate">
                  {chain}
                </span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E7F60E] rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-16 text-right text-sm font-medium text-[#171717] tabular-nums">
                  ${(value / 1e9).toFixed(1)}B
                </span>
              </div>
            );
          })}
          {chains.length === 0 && (
            <p className="text-sm text-[#9CA3AF] text-center py-4">데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
