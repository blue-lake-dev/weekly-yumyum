"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";
import { useChainDataSuspense } from "@/lib/hooks/use-chain-data";
import { useTicker } from "@/lib/hooks/use-ticker";
import type { Chain, EthData } from "@/lib/api/fetchers";

interface ChainTabsProps {
  activeChain: Chain;
  onChainChange: (chain: Chain) => void;
}

// Data types for each chain
interface BtcData {
  chain: "btc";
  price7d: { change: number | null; sparkline: number[] };
  supply: { circulating: number | null; maxSupply: number | null; percentMined: number | null };
  etfFlows: { today: number | null; history: Array<{ date: string; value: number | null }> };
}


interface SolData {
  chain: "sol";
  price7d: { change: number | null; sparkline: number[] };
  supply: { total: number | null; circulating: number | null; staked: number | null; stakingPct: number | null };
  inflation: { annualRatePct: number | null; epoch: number | null };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null };
  etfFlows: { today: number | null; history: Array<{ date: string; value: number | null }> };
}

const chainLabels: Record<Chain, string> = {
  btc: "BTC",
  eth: "ETH",
  sol: "SOL",
};

const chainImages: Record<Chain, string> = {
  btc: "/assets/pixels/bitcoin.png",
  eth: "/assets/pixels/ethereum.png",
  sol: "/assets/pixels/solana.png",
};

function formatBillions(value: number | null): string {
  if (value === null) return "—";
  return `$${(value / 1e9).toFixed(2)}B`;
}

function formatMillions(value: number | null): string {
  if (value === null) return "—";
  return `${(value / 1e6).toFixed(2)}M`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

// Transform sparkline array to chart data
function toSparklineData(sparkline: number[]): Array<{ value: number }> {
  return sparkline.map((value) => ({ value }));
}

// Transform sparkline array to chart data with dates (for tooltip)
function toSparklineDataWithDates(sparkline: number[]): Array<{ value: number; date: string }> {
  const today = new Date();
  return sparkline.map((value, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (sparkline.length - 1 - index));
    return {
      value,
      date: date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    };
  });
}

// Format change with arrow (like Ticker)
function formatChange7d(change: number | null): { arrow: string; value: string; color: string } {
  if (change === null) return { arrow: "", value: "—", color: "text-[#6B7280]" };
  const arrow = change >= 0 ? "▲" : "▼";
  const color = change >= 0 ? "text-[#16A34A]" : "text-[#DC2626]";
  return { arrow, value: `${Math.abs(change).toFixed(2)}%`, color };
}

// TVL Chart with Exclude L1 toggle
interface TvlChartProps {
  data: {
    dates: string[];
    chains: Array<{ name: string; values: number[]; current: number }>;
    totals: { current: number; previous: number; change7d: number | null };
  };
}

// Colors for L2 chains in TVL chart
const L2_LINE_COLORS: Record<string, string> = {
  Base: "#0052FF",
  Arbitrum: "#28A0F0",
  Polygon: "#8247E5",
  others: "#9CA3AF",
};

function TvlChart({ data }: TvlChartProps) {
  const [excludeL1, setExcludeL1] = useState(false);

  // Separate L1 (Ethereum) and L2s
  const ethereum = data.chains.find((c) => c.name === "Ethereum");
  const l2Chains = data.chains.filter((c) => c.name !== "Ethereum");

  // Current totals
  const l2Total = l2Chains.reduce((sum, c) => sum + c.current, 0);
  const displayValue = excludeL1 ? l2Total : data.totals.current;

  const change = formatChange7d(data.totals.change7d);

  // Build chart data (always include L1/L2 for tooltip)
  const chartData = data.dates.map((date, index) => {
    const l1Val = (ethereum?.values[index] ?? 0) / 1e9;
    const l2Val = l2Chains.reduce((sum, c) => sum + c.values[index], 0) / 1e9;

    const entry: Record<string, number | string> = {
      date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      _l1: l1Val,
      _l2: l2Val,
    };

    if (excludeL1) {
      // Individual L2 chains
      l2Chains.forEach((chain) => {
        entry[chain.name] = chain.values[index] / 1e9;
      });
    } else {
      // Total
      entry.total = l1Val + l2Val;
    }

    return entry;
  });

  // Calculate domain
  let min: number, max: number;
  if (excludeL1) {
    const allValues = chartData.flatMap((d) =>
      l2Chains.map((c) => d[c.name] as number)
    );
    min = Math.min(...allValues);
    max = Math.max(...allValues);
  } else {
    const values = chartData.map((d) => d.total as number);
    min = Math.min(...values);
    max = Math.max(...values);
  }
  const padding = (max - min) * 0.15 || max * 0.05;
  const domain: [number, number] = [Math.max(0, min - padding), max + padding];

  // Render tooltip content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;

    const d = payload[0].payload;

    return (
      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-xs shadow-lg min-w-32">
        <p className="text-[#6B7280] mb-2 font-medium">{label}</p>
        {excludeL1 ? (
          // L2 breakdown
          payload.map((entry: { dataKey: string; value: number; color: string }) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[#171717]">{entry.dataKey}</span>
              </div>
              <span className="text-[#171717] font-medium tabular-nums">${entry.value.toFixed(2)}B</span>
            </div>
          ))
        ) : (
          // Total with L1/L2 breakdown
          <>
            <div className="flex items-center justify-between gap-3 py-0.5">
              <span className="text-[#171717] font-medium">Total</span>
              <span className="text-[#171717] font-medium tabular-nums">${(d._l1 + d._l2).toFixed(2)}B</span>
            </div>
            <div className="border-t border-[#E5E7EB] mt-1 pt-1">
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <span>L1 (Ethereum)</span>
                <span className="tabular-nums">${d._l1.toFixed(2)}B</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <span>L2</span>
                <span className="tabular-nums">${d._l2.toFixed(2)}B</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm text-[#6B7280]">TVL {excludeL1 && <span className="text-[#9CA3AF]">(L2)</span>}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold tabular-nums text-[#171717]">
              {formatBillions(displayValue)}
            </p>
            <span className={`text-xs font-medium tabular-nums ${change.color}`}>
              <span className="text-[9px]">{change.arrow}</span> {change.value} <span className="text-[#9CA3AF]">7d</span>
            </span>
          </div>
        </div>
        {/* Exclude L1 checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeL1}
            onChange={(e) => setExcludeL1(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-0"
          />
          <span className="text-xs text-[#6B7280]">Exclude L1</span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#9CA3AF" }} />
            <YAxis
              domain={domain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              tickFormatter={(v) => `$${v.toFixed(0)}B`}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "#E5E7EB", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={renderTooltip}
            />
            {excludeL1 ? (
              // Individual L2 lines
              l2Chains.map((chain) => (
                <Area
                  key={chain.name}
                  type="monotone"
                  dataKey={chain.name}
                  stroke={L2_LINE_COLORS[chain.name] || "#9CA3AF"}
                  fill={L2_LINE_COLORS[chain.name] || "#9CA3AF"}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))
            ) : (
              // Total line
              <Area
                type="monotone"
                dataKey="total"
                stroke="#171717"
                fill="#171717"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for L2 mode */}
      {excludeL1 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {l2Chains.map((chain) => (
            <div key={chain.name} className="flex items-center gap-1 text-[10px] text-[#6B7280]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: L2_LINE_COLORS[chain.name] || "#9CA3AF" }}
              />
              {chain.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// Stablecoins Chart (same pattern as TVL)
interface StablecoinsChartProps {
  data: {
    dates: string[];
    chains: Array<{ name: string; values: number[]; current: number }>;
    totals: { current: number; previous: number; change7d: number | null };
  };
}

function StablecoinsChart({ data }: StablecoinsChartProps) {
  const [excludeL1, setExcludeL1] = useState(false);

  // Separate L1 (Ethereum) and L2s
  const ethereum = data.chains.find((c) => c.name === "Ethereum");
  const l2Chains = data.chains.filter((c) => c.name !== "Ethereum");

  // Current totals
  const l2Total = l2Chains.reduce((sum, c) => sum + c.current, 0);
  const displayValue = excludeL1 ? l2Total : data.totals.current;

  const change = formatChange7d(data.totals.change7d);

  // Build chart data (always include L1/L2 for tooltip)
  const chartData = data.dates.map((date, index) => {
    const l1Val = (ethereum?.values[index] ?? 0) / 1e9;
    const l2Val = l2Chains.reduce((sum, c) => sum + c.values[index], 0) / 1e9;

    const entry: Record<string, number | string> = {
      date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
      _l1: l1Val,
      _l2: l2Val,
    };

    if (excludeL1) {
      // Individual L2 chains
      l2Chains.forEach((chain) => {
        entry[chain.name] = chain.values[index] / 1e9;
      });
    } else {
      // Total
      entry.total = l1Val + l2Val;
    }

    return entry;
  });

  // Calculate domain
  let min: number, max: number;
  if (excludeL1) {
    const allValues = chartData.flatMap((d) =>
      l2Chains.map((c) => d[c.name] as number)
    );
    min = Math.min(...allValues);
    max = Math.max(...allValues);
  } else {
    const values = chartData.map((d) => d.total as number);
    min = Math.min(...values);
    max = Math.max(...values);
  }
  const padding = (max - min) * 0.15 || max * 0.05;
  const domain: [number, number] = [Math.max(0, min - padding), max + padding];

  // Render tooltip content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;

    const d = payload[0].payload;

    return (
      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-xs shadow-lg min-w-32">
        <p className="text-[#6B7280] mb-2 font-medium">{label}</p>
        {excludeL1 ? (
          // L2 breakdown
          payload.map((entry: { dataKey: string; value: number; color: string }) => (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[#171717]">{entry.dataKey}</span>
              </div>
              <span className="text-[#171717] font-medium tabular-nums">${entry.value.toFixed(2)}B</span>
            </div>
          ))
        ) : (
          // Total with L1/L2 breakdown
          <>
            <div className="flex items-center justify-between gap-3 py-0.5">
              <span className="text-[#171717] font-medium">Total</span>
              <span className="text-[#171717] font-medium tabular-nums">${(d._l1 + d._l2).toFixed(2)}B</span>
            </div>
            <div className="border-t border-[#E5E7EB] mt-1 pt-1">
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <span>L1 (Ethereum)</span>
                <span className="tabular-nums">${d._l1.toFixed(2)}B</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <span>L2</span>
                <span className="tabular-nums">${d._l2.toFixed(2)}B</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm text-[#6B7280]">Stablecoins {excludeL1 && <span className="text-[#9CA3AF]">(L2)</span>}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold tabular-nums text-[#171717]">
              {formatBillions(displayValue)}
            </p>
            <span className={`text-xs font-medium tabular-nums ${change.color}`}>
              <span className="text-[9px]">{change.arrow}</span> {change.value} <span className="text-[#9CA3AF]">7d</span>
            </span>
          </div>
        </div>
        {/* Exclude L1 checkbox */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeL1}
            onChange={(e) => setExcludeL1(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#10B981] focus:ring-[#10B981] focus:ring-offset-0"
          />
          <span className="text-xs text-[#6B7280]">Exclude L1</span>
        </label>
      </div>

      {/* Chart */}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#9CA3AF" }} />
            <YAxis
              domain={domain}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fill: "#9CA3AF" }}
              tickFormatter={(v) => `$${v.toFixed(0)}B`}
              width={40}
            />
            <Tooltip
              cursor={{ stroke: "#E5E7EB", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={renderTooltip}
            />
            {excludeL1 ? (
              // Individual L2 lines (same colors as TVL)
              l2Chains.map((chain) => (
                <Area
                  key={chain.name}
                  type="monotone"
                  dataKey={chain.name}
                  stroke={L2_LINE_COLORS[chain.name] || "#9CA3AF"}
                  fill={L2_LINE_COLORS[chain.name] || "#9CA3AF"}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))
            ) : (
              // Total line (green for stablecoins)
              <Area
                type="monotone"
                dataKey="total"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.1}
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend for L2 mode */}
      {excludeL1 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {l2Chains.map((chain) => (
            <div key={chain.name} className="flex items-center gap-1 text-[10px] text-[#6B7280]">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: L2_LINE_COLORS[chain.name] || "#9CA3AF" }}
              />
              {chain.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Transform ETF flow history for bar chart
function toFlowChartData(history: Array<{ date: string; value: number | null }>) {
  return history.map((d) => ({
    date: d.date.slice(5), // "MM-DD"
    value: d.value ?? 0,
    positive: d.value && d.value > 0 ? d.value : 0,
    negative: d.value && d.value < 0 ? d.value : 0,
  })).reverse();
}

export function ChainTabs({ activeChain, onChainChange }: ChainTabsProps) {
  const { data } = useChainDataSuspense(activeChain);
  const chains: Chain[] = ["btc", "eth", "sol"];

  return (
    <section className="mb-6">
      {/* Section Label */}
      <h2 className="mb-3 font-pixel text-lg text-[#171717]">체인별 현황</h2>

      {/* Tabs - underline style like Header nav */}
      <div className="flex items-center gap-8 border-b border-[#E5E7EB]">
        {chains.map((chain) => {
          const isActive = activeChain === chain;
          return (
            <button
              key={chain}
              onClick={() => onChainChange(chain)}
              className={`relative flex items-center gap-2.5 h-14 text-base font-medium transition-colors ${
                isActive
                  ? "text-[#171717] font-semibold"
                  : "text-[#6B7280] hover:text-[#171717]"
              }`}
            >
              <Image
                src={chainImages[chain]}
                alt={chainLabels[chain]}
                width={32}
                height={32}
                className="object-contain"
              />
              {chainLabels[chain]}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E7F60E]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content - no outer wrapper, each row is its own card */}
      <div className="mt-2">
        {!data ? (
          <ChainSkeleton />
        ) : data.chain === "btc" ? (
          <BtcContent data={data} />
        ) : data.chain === "eth" ? (
          <EthContent data={data} />
        ) : (
          <SolContent data={data} />
        )}
      </div>
    </section>
  );
}

function ChainSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-32 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    </div>
  );
}

function BtcContent({ data }: { data: BtcData }) {
  return (
    <div className="space-y-4">
      {/* Price Sparkline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#171717]">7일 가격 추이</h3>
          <span className={`text-sm font-medium tabular-nums ${(data.price7d.change ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            {formatPercent(data.price7d.change)}
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={toSparklineData(data.price7d.sparkline)}>
              <Area type="monotone" dataKey="value" stroke="#F7931A" fill="#F7931A" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="유통량" value={formatMillions(data.supply.circulating)} subValue="BTC" />
        <StatCard label="최대 공급량" value={formatMillions(data.supply.maxSupply)} subValue="BTC" />
        <StatCard label="채굴률" value={data.supply.percentMined ? `${data.supply.percentMined.toFixed(1)}%` : "—"} />
      </div>

      {/* ETF Flow Chart */}
      <EtfFlowChart history={data.etfFlows.history} today={data.etfFlows.today} color="#F7931A" />
    </div>
  );
}

function EthContent({ data }: { data: EthData }) {
  const { data: tickers = [] } = useTicker();
  const ethTicker = tickers.find((t) => t.symbol.toUpperCase() === "ETH");
  const currentPrice = ethTicker?.price ?? null;
  const change7d = formatChange7d(data.price7d.change);

  return (
    <div className="space-y-4">
      {/* Row 1: Price */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-4">
        {/* Header: Label + High/Low */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm text-[#6B7280]">ETH 가격</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <span className={`text-sm font-medium tabular-nums ${change7d.color}`}>
                <span className="text-[10px]">{change7d.arrow}</span> {change7d.value} <span className="text-[#9CA3AF]">7d</span>
              </span>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-[#6B7280]">
              7일 고가 <span className="font-semibold tabular-nums text-[#171717]">${data.price7d.high?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}</span>
            </p>
            <p className="text-[#6B7280]">
              7일 저가 <span className="font-semibold tabular-nums text-[#171717]">${data.price7d.low?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "—"}</span>
            </p>
          </div>
        </div>
        {/* Sparkline */}
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={toSparklineDataWithDates(data.price7d.sparkline)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <YAxis domain={["dataMin - 50", "dataMax + 50"]} hide />
              <Tooltip
                cursor={{ stroke: "#627EEA", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as { value: number; date: string };
                  return (
                    <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-xs shadow-lg">
                      <p className="text-[#6B7280] mb-1">{item.date}</p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#627EEA]" />
                        <span className="text-[#171717] font-medium tabular-nums">
                          ${item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#627EEA"
                fill="#627EEA"
                fillOpacity={0.15}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: TVL + Stablecoins (side by side) */}
      <div className="flex gap-4">
        <TvlChart data={data.l2Tvl} />
        <StablecoinsChart data={data.l2Stablecoins} />
      </div>

      {/* ETF Flow Chart */}
      <EtfFlowChart history={data.etfFlows.history} today={data.etfFlows.today} color="#627EEA" />
    </div>
  );
}

function SolContent({ data }: { data: SolData }) {
  return (
    <div className="space-y-4">
      {/* Price Sparkline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#171717]">7일 가격 추이</h3>
          <span className={`text-sm font-medium tabular-nums ${(data.price7d.change ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            {formatPercent(data.price7d.change)}
          </span>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={toSparklineData(data.price7d.sparkline)}>
              <Area type="monotone" dataKey="value" stroke="#00FFA3" fill="#00FFA3" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="스테이킹" value={data.supply.stakingPct ? `${data.supply.stakingPct.toFixed(1)}%` : "—"} subValue={formatMillions(data.supply.staked) + " SOL"} />
        <StatCard label="TVL" value={formatBillions(data.tvl.total)} change={data.tvl.change7d} />
        <StatCard label="스테이블코인" value={formatBillions(data.stablecoins.total)} change={data.stablecoins.change7d} />
        <StatCard label="인플레이션율" value={data.inflation.annualRatePct ? `${data.inflation.annualRatePct.toFixed(2)}%` : "—"} />
      </div>

      {/* ETF Flow Chart */}
      <EtfFlowChart history={data.etfFlows.history} today={data.etfFlows.today} color="#00FFA3" />
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  change,
  highlight
}: {
  label: string;
  value: string;
  subValue?: string;
  change?: number | null;
  highlight?: "deflationary";
}) {
  return (
    <div className="bg-[#F6F7F9] rounded-lg p-3">
      <p className="text-xs text-[#6B7280] mb-1">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${highlight === "deflationary" ? "text-[#16A34A]" : "text-[#171717]"}`}>
        {value}
        {highlight === "deflationary" && <span className="ml-1 text-xs">🔥</span>}
      </p>
      {subValue && <p className="text-xs text-[#9CA3AF]">{subValue}</p>}
      {change !== undefined && change !== null && (
        <p className={`text-xs font-medium tabular-nums ${change >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
          {formatPercent(change)} (7d)
        </p>
      )}
    </div>
  );
}

function EtfFlowChart({
  history,
  today,
  color
}: {
  history: Array<{ date: string; value: number | null }>;
  today: number | null;
  color: string;
}) {
  const chartData = toFlowChartData(history);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[#171717]">ETF 자금흐름 (7일)</h3>
        {today !== null && (
          <span className={`text-sm font-medium tabular-nums ${today >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            오늘: {today >= 0 ? "+" : ""}${Math.abs(today).toFixed(1)}M
          </span>
        )}
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} stackOffset="sign">
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
            <YAxis hide />
            <Tooltip
              cursor={false}
              contentStyle={{ backgroundColor: "#171717", border: "none", borderRadius: "8px", color: "#fff", fontSize: 12 }}
              formatter={(value) => [`$${Math.abs(Number(value) || 0).toFixed(1)}M`, ""]}
            />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Bar dataKey="positive" fill={color} stackId="stack" radius={[2, 2, 0, 0]} />
            <Bar dataKey="negative" fill="#DC2626" stackId="stack" radius={[0, 0, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
