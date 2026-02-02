"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useTicker } from "@/lib/hooks/use-ticker";

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

  // For prices >= $1: show 2 decimals, but hide if .00
  const hasDecimals = price % 1 !== 0;
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

function formatChange(change: number | null): { arrow: string; value: string } {
  if (change === null) return { arrow: "", value: "—" };
  const arrow = change >= 0 ? "▲" : "▼";
  return { arrow, value: `${Math.abs(change).toFixed(2)}%` };
}

interface FlashState {
  [symbol: string]: "up" | "down" | null;
}

export function Ticker() {
  const { data: tickers = [] } = useTicker();
  const prevPricesRef = useRef<Map<string, number>>(new Map());
  const [flashStates, setFlashStates] = useState<FlashState>({});
  const [expanded, setExpanded] = useState(false);

  // Detect price changes and trigger flash animations
  useEffect(() => {
    if (tickers.length === 0) return;

    const newFlashStates: FlashState = {};
    const prevPrices = prevPricesRef.current;

    tickers.forEach((ticker) => {
      const prevPrice = prevPrices.get(ticker.symbol);
      const currentPrice = ticker.price;

      if (prevPrice !== undefined && currentPrice !== null && prevPrice !== currentPrice) {
        newFlashStates[ticker.symbol] = currentPrice > prevPrice ? "up" : "down";
      }

      // Update stored price
      if (currentPrice !== null) {
        prevPrices.set(ticker.symbol, currentPrice);
      }
    });

    // Only update state if there are changes
    if (Object.keys(newFlashStates).length > 0) {
      setFlashStates(newFlashStates);

      // Clear flash states after animation completes
      const timer = setTimeout(() => {
        setFlashStates({});
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [tickers]);


  if (tickers.length === 0) {
    return <div className="w-full bg-[#DEE1E5] h-10 animate-pulse" />;
  }

  const renderTickerItem = (ticker: typeof tickers[0]) => {
    const changeColor =
      ticker.change24h === null
        ? "text-[#6B7280]"
        : ticker.change24h >= 0
          ? "text-[#16A34A]"
          : "text-[#DC2626]";

    const flashClass = flashStates[ticker.symbol]
      ? flashStates[ticker.symbol] === "up"
        ? "animate-flash-up"
        : "animate-flash-down"
      : "";

    const { arrow, value } = formatChange(ticker.change24h);

    const priceText = formatPrice(ticker.price);

    return (
      <div key={ticker.symbol} className="flex items-center gap-1 whitespace-nowrap">
        <Image
          src={ticker.image}
          alt={ticker.name}
          width={20}
          height={20}
          className="rounded-full"
        />
        <span className="font-medium text-[#171717]">{ticker.symbol}</span>
        <span className={`price-flash font-medium text-[#171717] tabular-nums ${flashClass}`}>
          {priceText}
          {flashClass && <span className="price-flash-overlay">{priceText}</span>}
        </span>
        <span className={`text-sm font-normal tabular-nums ${changeColor}`}>
          <span className="text-[10px]">{arrow}</span> {value}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#DEE1E5]">
      <div className={`flex gap-4 px-4 py-2.5 ${expanded ? "items-start" : "items-center"}`}>
        {/* Fixed label */}
        <div className="flex-shrink-0 font-medium text-[#171717]">
          ⭐️ Top 10
        </div>

        {/* Ticker items */}
        <div className={`flex-1 flex items-center gap-x-8 gap-y-2 ${expanded ? "flex-wrap" : "overflow-hidden"}`}>
          {tickers.map((ticker) => renderTickerItem(ticker))}
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs text-[#6B7280] hover:text-[#171717] transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
    </div>
  );
}
