"use client";

import Image from "next/image";

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
  { key: "btc" as const, label: "BTC", image: "/assets/pixels/bitcoin.png" },
  { key: "eth" as const, label: "ETH", image: "/assets/pixels/ethereum.png" },
  { key: "sol" as const, label: "SOL", image: "/assets/pixels/solana.png" },
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
    <div className="space-y-4">
      {/* Column Headers */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-[#6B7280]">롱/숏 비율</span>
        <span className="font-semibold text-sm text-[#6B7280]">펀딩비</span>
      </div>

      {/* Rows */}
      {symbols.map(({ key, label, image }) => {
        const item = data[key];
        if (!item) {
          return (
            <div key={key} className="flex items-center gap-3">
              <Image src={image} alt={label} width={32} height={32} className="flex-shrink-0" />
              <span className="text-sm font-semibold text-[#171717] w-10">{label}</span>
              <div className="flex-1 text-center text-sm text-[#9CA3AF]">데이터 없음</div>
            </div>
          );
        }

        const fundingValue = parseFloat(item.fundingRatePct);
        const fundingColor = fundingValue >= 0 ? "text-[#16A34A]" : "text-[#DC2626]";

        return (
          <div key={key} className="flex items-center gap-3">
            {/* Coin Image */}
            <Image src={image} alt={label} width={32} height={32} className="flex-shrink-0" />

            {/* Main Content - 80% width */}
            <div className="w-[80%]">
              {/* Row above bar: Symbol + percentages */}
              <div className="flex items-center justify-between mb-1">
                {/* Left: Symbol + Long % */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#171717]">{label}</span>
                  <span className="text-sm font-medium text-[#16A34A] tabular-nums">{item.longPct}%</span>
                </div>
                {/* Right: Short % */}
                <span className="text-sm font-medium text-[#DC2626] tabular-nums">{item.shortPct}%</span>
              </div>

              {/* Bar with liquid animation */}
              <div className="h-4 bg-[#FECACA] rounded-full overflow-hidden relative">
                {/* Long (green) portion */}
                <div
                  className="absolute inset-y-0 left-0 bg-[#16A34A] rounded-l-full transition-all duration-700 ease-in-out"
                  style={{ width: `${item.longPct}%` }}
                />
                {/* Short (red) portion - always fills remaining */}
                <div
                  className="absolute inset-y-0 right-0 bg-[#DC2626] rounded-r-full transition-all duration-700 ease-in-out"
                  style={{ width: `${item.shortPct}%` }}
                />
              </div>
            </div>

            {/* Funding Rate - pushed to right */}
            <div className={`ml-auto text-right text-base font-semibold tabular-nums ${fundingColor}`}>
              {fundingValue >= 0 ? "+" : ""}{item.fundingRatePct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
