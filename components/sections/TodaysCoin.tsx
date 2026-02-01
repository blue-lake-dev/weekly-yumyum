"use client";

import { useState } from "react";
import { useGainersLosersSuspense } from "@/lib/hooks/use-gainers-losers";

function CoinBadge({ symbol, change, type }: { symbol: string; change: number; type: "gainer" | "loser" }) {
  const bgColor = type === "gainer" ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]";
  const textColor = type === "gainer" ? "text-[#16A34A]" : "text-[#DC2626]";
  const sign = change >= 0 ? "+" : "";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium ${bgColor}`}>
      <span className="text-[#171717]">{symbol}</span>
      <span className={`tabular-nums ${textColor}`}>{sign}{change.toFixed(1)}%</span>
    </span>
  );
}

export function TodaysCoin() {
  const { data } = useGainersLosersSuspense();
  const [expanded, setExpanded] = useState(false);

  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  // Show 3 by default, 10 when expanded
  const displayCount = expanded ? 10 : 3;
  const displayGainers = gainers.slice(0, displayCount);
  const displayLosers = losers.slice(0, displayCount);

  return (
    <section className="mb-6 rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#171717]">오늘의 코인</h2>
        {(gainers.length > 3 || losers.length > 3) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#6B7280] hover:text-[#171717] transition-colors"
          >
            {expanded ? "접기 ▲" : "더보기 ▼"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Gainers */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">🔥</span>
          {displayGainers.map((coin) => (
            <CoinBadge key={coin.symbol} symbol={coin.symbol} change={coin.change} type="gainer" />
          ))}
          {displayGainers.length === 0 && (
            <span className="text-sm text-[#6B7280]">데이터 없음</span>
          )}
        </div>

        {/* Losers */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">📉</span>
          {displayLosers.map((coin) => (
            <CoinBadge key={coin.symbol} symbol={coin.symbol} change={coin.change} type="loser" />
          ))}
          {displayLosers.length === 0 && (
            <span className="text-sm text-[#6B7280]">데이터 없음</span>
          )}
        </div>
      </div>
    </section>
  );
}
