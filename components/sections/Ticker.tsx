"use client";

import { useState } from "react";
import { useTicker } from "@/lib/hooks/use-ticker";
import { Skeleton } from "@/components/ui/Skeleton";

function formatPrice(price: number | null): string {
  if (price === null) return "—";
  const decimals = price >= 1000 ? 0 : price >= 1 ? 2 : 4;
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatChange(change: number | null): string {
  if (change === null) return "—";
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

const symbolIcons: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
};

export function Ticker() {
  const [expanded, setExpanded] = useState(false);
  const { data: tickers = [], isLoading } = useTicker();

  // Show top 3 by default, all when expanded
  const displayTickers = expanded ? tickers : tickers.slice(0, 3);

  if (isLoading) {
    return (
      <section className="mb-4">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-32" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        {displayTickers.map((ticker) => {
          const changeColor =
            ticker.change24h === null
              ? "text-[#6B7280]"
              : ticker.change24h >= 0
                ? "text-[#16A34A]"
                : "text-[#DC2626]";

          return (
            <div
              key={ticker.symbol}
              className="flex items-center gap-2 rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 shadow-sm"
            >
              <span className="text-lg">{symbolIcons[ticker.symbol] || ticker.symbol}</span>
              <span className="font-medium text-[#171717]">{ticker.symbol}</span>
              <span className="font-semibold text-[#171717] tabular-nums">
                {formatPrice(ticker.price)}
              </span>
              <span className={`text-sm font-medium tabular-nums ${changeColor}`}>
                {formatChange(ticker.change24h)}
              </span>
            </div>
          );
        })}

        {tickers.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-[#6B7280] hover:text-[#171717] transition-colors"
          >
            {expanded ? "접기 ▲" : "더보기 ▼"}
          </button>
        )}
      </div>
    </section>
  );
}
