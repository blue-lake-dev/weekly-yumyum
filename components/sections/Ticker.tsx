"use client";

import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { useTicker } from "@/lib/hooks/use-ticker";
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

    // Only update state if there are changes - intentional price flash animation
    if (Object.keys(newFlashStates).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const renderTickerItem = (ticker: typeof tickers[0], index: number, isDuplicate: boolean) => {
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
      <div
        key={isDuplicate ? `${ticker.symbol}-dup-${index}` : ticker.symbol}
        className="flex items-center gap-1 whitespace-nowrap"
      >
        <Image
          src={ticker.image}
          alt={ticker.name}
          width={20}
          height={20}
          className="rounded-full"
          placeholder="blur"
          blurDataURL={COIN_IMAGE_PLACEHOLDER}
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
    <div className="w-full bg-[#DEE1E5] overflow-hidden">
      <div className="flex items-center gap-4 px-4 py-2.5">
        {/* Fixed label */}
        <div className="flex-shrink-0 font-medium text-[#171717]">
          ⭐️ Top 10
        </div>

        {/* Scrolling marquee container */}
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-marquee">
            {/* First set */}
            <div className="flex items-center gap-4 shrink-0 pr-4">
              {tickers.map((ticker, index) => renderTickerItem(ticker, index, false))}
            </div>
            {/* Duplicate for seamless loop */}
            <div className="flex items-center gap-4 shrink-0 pr-4">
              {tickers.map((ticker, index) => renderTickerItem(ticker, index, true))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
