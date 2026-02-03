"use client";

import { useState } from "react";
import Image from "next/image";
import { useGainersLosersSuspense } from "@/lib/hooks/use-gainers-losers";
import type { CoinChange } from "@/lib/api/fetchers";
import { formatPercent } from "@/lib/utils/format";
import { COIN_IMAGE_PLACEHOLDER } from "@/lib/constants";

function formatPrice(price: number | null): string {
  if (price === null) return "—";

  if (price < 1) {
    // Small prices: show 4 decimals
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });
  }

  // For prices >= $1: show 2 decimals
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CoinRow({
  coin,
  rank,
  type,
}: {
  coin: CoinChange;
  rank: number;
  type: "gainer" | "loser";
}) {
  const changeColor = type === "gainer" ? "text-[#16A34A]" : "text-[#DC2626]";

  return (
    <div className="flex items-center gap-2 py-2 px-3 mx-2 hover:bg-[#F6F7F9] rounded-lg transition-colors">
      {/* Rank */}
      <span className="w-5 text-sm font-medium text-[#9CA3AF] tabular-nums">
        {rank}
      </span>

      {/* Coin image */}
      <Image
        src={coin.image}
        alt={coin.name}
        width={24}
        height={24}
        className="rounded-full"
        placeholder="blur"
        blurDataURL={COIN_IMAGE_PLACEHOLDER}
      />

      {/* Symbol */}
      <span className="text-sm font-semibold text-[#171717]">
        {coin.symbol}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price + Change grouped tightly */}
      <span className="text-sm font-semibold text-[#171717] tabular-nums">
        {formatPrice(coin.price)}
      </span>
      <span className={`text-sm font-medium tabular-nums w-[58px] text-right ${changeColor}`}>
        {formatPercent(coin.change, true)}
      </span>
    </div>
  );
}

function CoinCard({
  title,
  titleColor,
  coins,
  displayCount,
  type,
}: {
  title: string;
  titleColor: string;
  coins: CoinChange[];
  displayCount: number;
  type: "gainer" | "loser";
}) {
  const displayCoins = coins.slice(0, displayCount);

  return (
    <div className="flex-1 min-w-0 rounded-xl bg-white border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-4 py-3">
        <h3 className="text-sm">
          <span className="font-bold text-[#171717]">Top 10 </span>
          <span className={`font-semibold ${titleColor}`}>{title}</span>
        </h3>
      </div>

      {/* Coin List */}
      <div className="py-1">
        {displayCoins.length > 0 ? (
          displayCoins.map((coin, index) => (
            <CoinRow
              key={coin.symbol}
              coin={coin}
              rank={index + 1}
              type={type}
            />
          ))
        ) : (
          <div className="px-4 py-6 text-center text-sm text-[#6B7280]">
            데이터 없음
          </div>
        )}
      </div>
    </div>
  );
}

export function TodaysCoin() {
  const { data } = useGainersLosersSuspense();
  const [expanded, setExpanded] = useState(false);

  const gainers = data?.gainers ?? [];
  const losers = data?.losers ?? [];

  // Show 3 by default, 10 when expanded
  const displayCount = expanded ? 10 : 3;
  const hasMore = gainers.length > 3 || losers.length > 3;

  return (
    <section className="mb-6">
      {/* Section Header - Outside cards */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-pixel text-lg text-[#171717]">
          오늘의 코인 (Gainers/Losers)
        </h2>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#6B7280] hover:text-[#171717] transition-colors"
          >
            {expanded ? "접기 ▲" : "더보기 ▼"}
          </button>
        )}
      </div>

      {/* Two Cards Side by Side */}
      <div className="flex flex-col sm:flex-row gap-3">
        <CoinCard
          title="gainers"
          titleColor="text-[#16A34A]"
          coins={gainers}
          displayCount={displayCount}
          type="gainer"
        />
        <CoinCard
          title="losers"
          titleColor="text-[#DC2626]"
          coins={losers}
          displayCount={displayCount}
          type="loser"
        />
      </div>
    </section>
  );
}
