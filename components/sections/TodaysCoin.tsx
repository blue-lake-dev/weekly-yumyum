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
    <a
      href={`https://www.coingecko.com/en/coins/${coin.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 sm:gap-2 py-1.5 sm:py-2 px-1.5 sm:px-3 mx-1 sm:mx-2 hover:bg-[#F6F7F9] rounded-lg transition-colors"
    >
      {/* Rank */}
      <span className="w-3 sm:w-5 text-xs sm:text-sm font-medium text-[#9CA3AF] tabular-nums">
        {rank}
      </span>

      {/* Coin image */}
      <Image
        src={coin.image}
        alt={coin.name}
        width={24}
        height={24}
        className="rounded-full w-5 h-5 sm:w-6 sm:h-6"
        placeholder="blur"
        blurDataURL={COIN_IMAGE_PLACEHOLDER}
      />

      {/* Symbol */}
      <span className="max-w-18 truncate text-xs sm:text-sm font-semibold text-[#171717]">
        {coin.symbol}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Price + Change grouped tightly */}
      <span className="hidden sm:inline text-sm font-semibold text-[#171717] tabular-nums">
        {formatPrice(coin.price)}
      </span>
      <span className={`shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium tabular-nums text-right ${changeColor}`}>
        {type === "gainer" ? "▲" : "▼"} {formatPercent(Math.abs(coin.change), false)}
      </span>
    </a>
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
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        <p className="font-semibold text-sm text-[#6B7280]">
          Top 10 <span className={titleColor}>{title}</span>
        </p>
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
    <section className="mb-3">
      {/* Section Header - Outside cards */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg text-[#171717]">
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
      <div className="flex gap-2">
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
