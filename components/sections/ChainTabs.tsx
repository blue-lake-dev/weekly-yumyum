"use client";

import { useState, Suspense } from "react";
import Image from "next/image";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { useChainDataSuspense } from "@/lib/hooks/use-chain-data";
import {
  fetchChainData,
  fetchBtcPrice,
  fetchBtcNetwork,
  fetchBtcIndicators,
  fetchBtcHoldings,
  queryKeys,
} from "@/lib/api/fetchers";
import { useTicker } from "@/lib/hooks/use-ticker";
import type {
  Chain,
  EthData,
  BtcPriceData,
  BtcNetworkData,
  BtcIndicatorsData,
  BtcHoldingsData,
} from "@/lib/api/fetchers";
import { formatEthAmount, formatPercent, formatCompactNumber, formatUsd, formatFlow } from "@/lib/utils/format";


// Data types for each chain
interface BtcData {
  chain: "btc";
  price7d: { change: number | null; sparkline: number[]; high: number | null; low: number | null };
  supply: { circulating: number | null; maxSupply: number | null; percentMined: number | null };
  mayerMultiple: { current: number | null; ma200: number | null; interpretation: "oversold" | "fair" | "overbought" | null };
  mempool: { pendingTxCount: number | null; pendingVsize: number | null; fees: { fastest: number | null; halfHour: number | null; hour: number | null; economy: number | null }; congestionLevel: "low" | "moderate" | "high" | "extreme" | null };
  hashrate: { current: number | null; change30d: number | null; sparkline: number[] };
  miningCost: { productionCost: number | null; date: string | null };
  companyHoldings: { totalBtc: number | null; totalUsd: number | null; companies: Array<{ name: string; symbol: string; holdings: number; value: number }> | null };
  etfFlows: { today: number | null; history: Array<{ date: string; value: number | null }> };
  etfHoldings: { totalBtc: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; btc: number; usd: number }> | null };
}


interface SolData {
  chain: "sol";
  price7d: { change: number | null; sparkline: number[]; high: number | null; low: number | null };
  supply: { total: number | null; circulating: number | null };
  staking: { staked: number | null; stakingPct: number | null; apy: number | null };
  inflation: { annualRatePct: number | null; epoch: number | null };
  fees: { daily: number | null; history: Array<{ date: string; feesSol: number }> };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null; sparkline: number[] };
  etfFlows: { today: number | null; history: Array<{ date: string; value: number | null }> };
  etfHoldings: { totalSol: number | null; totalUsd: number | null; holdings: Array<{ ticker: string; issuer: string; usd: number }> | null };
  datHoldings: { totalSol: number | null; totalUsd: number | null; supplyPct: number | null; companies: Array<{ name: string; holdings: number; holdingsUsd: number; supplyPct: number }> | null };
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
      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg min-w-36">
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
            <div className="border-t border-[#E5E7EB] mt-1.5 pt-1.5">
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#627EEA]" />
                  <span>L1 (Ethereum)</span>
                </div>
                <span className="tabular-nums">${d._l1.toFixed(2)}B</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                  <span>L2</span>
                </div>
                <span className="tabular-nums">${d._l2.toFixed(2)}B</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-[#6B7280]">총 예치량 {excludeL1 && <span className="text-[#9CA3AF]">(L2)</span>}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold tabular-nums text-[#171717]">
              {formatBillions(displayValue)}
            </p>
            <span className={`text-xs font-medium tabular-nums ${change.color}`}>
              <span className="text-[9px]">{change.arrow}</span> {change.value} <span className="text-[#9CA3AF]">7일</span>
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
          <span className="text-xs text-[#6B7280]">L1 제외</span>
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
                  dot={false}
                  activeDot={false}
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
                dot={false}
                activeDot={false}
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
      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg min-w-36">
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
            <div className="border-t border-[#E5E7EB] mt-1.5 pt-1.5">
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#627EEA]" />
                  <span>L1 (Ethereum)</span>
                </div>
                <span className="tabular-nums">${d._l1.toFixed(2)}B</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5 text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                  <span>L2</span>
                </div>
                <span className="tabular-nums">${d._l2.toFixed(2)}B</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-sm text-[#6B7280]">스테이블코인 {excludeL1 && <span className="text-[#9CA3AF]">(L2)</span>}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-bold tabular-nums text-[#171717]">
              {formatBillions(displayValue)}
            </p>
            <span className={`text-xs font-medium tabular-nums ${change.color}`}>
              <span className="text-[9px]">{change.arrow}</span> {change.value} <span className="text-[#9CA3AF]">7일</span>
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
          <span className="text-xs text-[#6B7280]">L1 제외</span>
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
                  dot={false}
                  activeDot={false}
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
                dot={false}
                activeDot={false}
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
  })).reverse();
}

// Format flow value with sign (e.g., "+$12M", "-$5M")
function formatFlowValue(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatUsd(Math.abs(value), 0)}`;
}

// Get color class for flow value (blue for inflows, red for outflows)
function getFlowColor(value: number | null): string {
  if (value === null) return "text-[#6B7280]";
  return value >= 0 ? "text-[#627EEA]" : "text-[#DC2626]";
}

// Holdings Card for ETH tab (ETF + DAT holdings with tabs)
function HoldingsCard({
  etfHoldings,
  datHoldings,
}: {
  etfHoldings: EthData["etfHoldings"];
  datHoldings: EthData["datHoldings"];
}) {
  const [activeTab, setActiveTab] = useState<"etf" | "dat">("etf");

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {/* Header: Label + Tabs */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm text-[#6B7280]">기관 보유량</p>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("etf")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "etf"
                ? "bg-[#627EEA] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            ETF
          </button>
          <button
            onClick={() => setActiveTab("dat")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "dat"
                ? "bg-[#627EEA] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            기업
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[24px_1fr_80px_72px] gap-2 text-[10px] text-[#9CA3AF] uppercase tracking-wide pb-1.5 border-b border-[#E5E7EB] mb-1 pr-2">
        <span>#</span>
        <span>이름</span>
        <span>보유량</span>
        <span>가치</span>
      </div>

      {/* Tab Content */}
      {activeTab === "etf" ? (
        <div>
          {/* Holdings List */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {etfHoldings.holdings?.map((h, index) => (
              <div
                key={h.ticker}
                className={`grid grid-cols-[24px_1fr_80px_72px] gap-2 text-xs py-1.5 ${
                  index % 2 === 1 ? "bg-[#F9FAFB]" : ""
                }`}
              >
                <span className="text-[#9CA3AF]">{index + 1}.</span>
                <span className="text-[#171717] truncate">{h.issuer}</span>
                <span className="tabular-nums text-[#171717]">
                  {formatEthAmount(h.eth)}
                </span>
                <span className="tabular-nums text-[#6B7280]">
                  {formatUsd(h.usd, 1)}
                </span>
              </div>
            )) ?? (
              <p className="text-xs text-[#9CA3AF] py-2">데이터 없음</p>
            )}
          </div>
          {/* Footer: Totals */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-1 flex items-center justify-between text-sm pr-2">
            <span className="text-[#6B7280]">총 보유</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-[#171717]">
                {formatEthAmount(etfHoldings.totalEth)} ETH
              </span>
              <span className="text-[#9CA3AF] tabular-nums text-xs">
                총 공급량 대비 {((etfHoldings.totalEth ?? 0) / 120_000_000 * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Companies List */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {datHoldings.companies?.map((c, index) => (
              <div
                key={c.name}
                className={`grid grid-cols-[24px_1fr_80px_72px] gap-2 text-xs py-1.5 ${
                  index % 2 === 1 ? "bg-[#F9FAFB]" : ""
                }`}
              >
                <span className="text-[#9CA3AF]">{index + 1}.</span>
                <span className="text-[#171717] truncate">{c.name}</span>
                <span className="tabular-nums text-[#171717]">
                  {formatEthAmount(c.holdings)}
                </span>
                <span className="tabular-nums text-[#6B7280]">
                  {formatUsd(c.holdingsUsd, 1)}
                </span>
              </div>
            )) ?? (
              <p className="text-xs text-[#9CA3AF] py-2">데이터 없음</p>
            )}
          </div>
          {/* Footer: Totals */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-1 flex items-center justify-between text-sm pr-2">
            <span className="text-[#6B7280]">총 보유</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-[#171717]">
                {formatEthAmount(datHoldings.totalEth)} ETH
              </span>
              <span className="text-[#9CA3AF] tabular-nums text-xs">
                총 공급량 대비 {datHoldings.supplyPct?.toFixed(2) ?? "—"}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Holdings Card for SOL tab (ETF + DAT holdings with tabs)
function SolHoldingsCard({
  etfHoldings,
  datHoldings,
}: {
  etfHoldings: SolData["etfHoldings"];
  datHoldings: SolData["datHoldings"];
}) {
  const [activeTab, setActiveTab] = useState<"etf" | "dat">("etf");

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {/* Header: Label + Tabs */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm text-[#6B7280]">기관 보유량</p>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("etf")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "etf"
                ? "bg-[#9945FF] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            ETF
          </button>
          <button
            onClick={() => setActiveTab("dat")}
            className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === "dat"
                ? "bg-[#9945FF] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            기업
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[24px_1fr_100px] gap-2 text-[10px] text-[#9CA3AF] uppercase tracking-wide pb-1.5 border-b border-[#E5E7EB] mb-1 pr-2">
        <span>#</span>
        <span>이름</span>
        <span className="text-right">보유량</span>
      </div>

      {/* Tab Content */}
      {activeTab === "etf" ? (
        <div>
          {/* Holdings List */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {etfHoldings.holdings?.map((h, index) => (
              <div
                key={h.ticker}
                className={`grid grid-cols-[24px_1fr_100px] gap-2 text-xs py-1.5 ${
                  index % 2 === 1 ? "bg-[#F9FAFB]" : ""
                }`}
              >
                <span className="text-[#9CA3AF]">{index + 1}.</span>
                <span className="text-[#171717] truncate">{h.issuer}</span>
                <span className="tabular-nums text-[#171717] text-right">
                  {h.usd > 0 ? formatUsd(h.usd, 1) : "—"}
                </span>
              </div>
            )) ?? (
              <p className="text-xs text-[#9CA3AF] py-2">데이터 없음</p>
            )}
          </div>
          {/* Footer: Totals */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-1 flex items-center justify-between text-sm pr-2">
            <span className="text-[#6B7280]">총 보유</span>
            <span className="font-semibold tabular-nums text-[#171717]">
              {formatUsd(etfHoldings.totalUsd, 1)}
            </span>
          </div>
        </div>
      ) : (
        <div>
          {/* Companies List */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {datHoldings.companies?.map((c, index) => (
              <div
                key={c.name}
                className={`grid grid-cols-[24px_1fr_100px] gap-2 text-xs py-1.5 ${
                  index % 2 === 1 ? "bg-[#F9FAFB]" : ""
                }`}
              >
                <span className="text-[#9CA3AF]">{index + 1}.</span>
                <span className="text-[#171717] truncate">{c.name}</span>
                <span className="tabular-nums text-[#171717] text-right">
                  {formatMillions(c.holdings)}
                </span>
              </div>
            )) ?? (
              <p className="text-xs text-[#9CA3AF] py-2">데이터 없음</p>
            )}
          </div>
          {/* Footer: Totals */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-1 flex items-center justify-between text-sm pr-2">
            <span className="text-[#6B7280]">총 보유</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-[#171717]">
                {formatMillions(datHoldings.totalSol)} SOL
              </span>
              <span className="text-[#9CA3AF] tabular-nums text-xs">
                총 공급량 대비 {datHoldings.supplyPct?.toFixed(2) ?? "—"}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ETF Flow Card with summary stats (reusable for ETH/SOL)
function EtfFlowCard({
  history,
  today,
  color = "#627EEA",
  isLoading = false,
}: {
  history: Array<{ date: string; value: number | null }>;
  today: number | null;
  color?: string;
  isLoading?: boolean;
}) {
  const chartData = toFlowChartData(history);

  // Calculate 7-day cumulative
  const cumulative7d = history.reduce((sum, d) => sum + (d.value ?? 0), 0);

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {/* Header */}
      <p className="font-semibold text-sm text-[#6B7280] mb-3">ETF 자금흐름</p>

      {isLoading ? (
        <div className="flex items-center justify-center h-[160px]">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="flex items-baseline gap-6 mb-3">
            <p className="text-xl font-bold tabular-nums" style={{ color: today === null ? "#6B7280" : today >= 0 ? color : "#DC2626" }}>
              {formatFlow(today)}
              <span className="text-xs text-[#9CA3AF] font-normal ml-1">1일</span>
            </p>
            <p className="text-xl font-bold tabular-nums" style={{ color: cumulative7d >= 0 ? color : "#DC2626" }}>
              {formatFlow(cumulative7d)}
              <span className="text-xs text-[#9CA3AF] font-normal ml-1">7일</span>
            </p>
          </div>

          {/* Bar Chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={false}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const value = payload[0].payload.value;
                    return (
                      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                        <p className="text-[#6B7280] mb-1">{label}</p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: value >= 0 ? color : "#DC2626" }} />
                          <span className="font-medium tabular-nums" style={{ color: value >= 0 ? color : "#DC2626" }}>
                            {formatFlow(value)}
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#E5E7EB" strokeWidth={1} />
                <Bar dataKey="value" radius={[2, 2, 2, 2]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.value >= 0 ? color : "#DC2626"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// Content component that fetches data and renders appropriate chain content
function ChainContent({ activeChain }: { activeChain: Chain }) {
  // BTC uses useQueries pattern (fetches its own data)
  if (activeChain === "btc") {
    return <BtcContent />;
  }

  // ETH and SOL still use the old pattern for now
  const { data } = useChainDataSuspense(activeChain);

  if (data.chain === "eth") {
    return <EthContent data={data} />;
  } else if (data.chain === "sol") {
    return <SolContent data={data} />;
  }

  return null;
}

export function ChainTabs() {
  const [activeChain, setActiveChain] = useState<Chain>("eth");
  const chains: Chain[] = ["btc", "eth", "sol"];
  const queryClient = useQueryClient();

  const prefetchChain = (chain: Chain) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.chain(chain),
      queryFn: () => fetchChainData(chain),
      staleTime: 15 * 60 * 1000,
    });
  };

  return (
    <section className="mb-3">
      {/* Section Label */}
      <h2 className="mb-1 font-bold text-lg text-[#171717]">체인별 현황</h2>

      {/* Tabs - underline style like Header nav */}
      <div className="flex items-center gap-6 border-b border-[#E5E7EB]">
        {chains.map((chain) => {
          const isActive = activeChain === chain;
          return (
            <button
              key={chain}
              onMouseEnter={() => prefetchChain(chain)}
              onClick={() => setActiveChain(chain)}
              className={`relative flex items-center gap-2.5 py-2 text-base font-medium transition-colors ${
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

      {/* Content */}
      <div className="mt-2">
        <Suspense fallback={<ChainSkeleton />}>
          <ChainContent activeChain={activeChain} />
        </Suspense>
      </div>
    </section>
  );
}

function ChainSkeleton() {
  return (
    <div className="space-y-2">
      {/* Row 1: Price card (full width) */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      {/* Row 2: 3-col stat cards */}
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl bg-white border border-[#E5E7EB] p-3 min-h-[140px]">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Row 3: 2-col chart cards */}
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
            <div className="mb-2">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Row 4: 2-col cards (ETF + Holdings) */}
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BtcContent() {
  // Fetch all 4 endpoints in parallel using useQueries
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.btcPrice,
        queryFn: fetchBtcPrice,
        staleTime: 30_000, // 30 seconds
      },
      {
        queryKey: queryKeys.btcNetwork,
        queryFn: fetchBtcNetwork,
        staleTime: 60_000, // 1 minute
      },
      {
        queryKey: queryKeys.btcIndicators,
        queryFn: fetchBtcIndicators,
        staleTime: 3600_000, // 1 hour
      },
      {
        queryKey: queryKeys.btcHoldings,
        queryFn: fetchBtcHoldings,
        staleTime: 3600_000, // 1 hour
      },
    ],
  });

  const [priceQuery, networkQuery, indicatorsQuery, holdingsQuery] = results;

  // TEMP: Force loading state to preview spinners
  const forceLoading = false;

  return (
    <div className="space-y-2">
      {/* Row 1: Price + Mayer Multiple */}
      <div className="flex gap-2">
        {/* Price Card */}
        <BtcPriceCard data={priceQuery.data} isLoading={forceLoading || priceQuery.isLoading} />
        {/* Mayer Multiple Card */}
        <BtcMayerCard data={indicatorsQuery.data} isLoading={forceLoading || indicatorsQuery.isLoading} />
      </div>

      {/* Row 2: Mining Cost + Mempool + Hashrate */}
      <div className="grid grid-cols-3 gap-2">
        {/* Mining Cost */}
        <BtcMiningCostCard
          data={indicatorsQuery.data}
          price={priceQuery.data?.price}
          isLoading={forceLoading || indicatorsQuery.isLoading}
        />
        {/* Mempool */}
        <BtcMempoolCard data={networkQuery.data} isLoading={forceLoading || networkQuery.isLoading} />
        {/* Hashrate */}
        <BtcHashrateCard data={networkQuery.data} isLoading={forceLoading || networkQuery.isLoading} />
      </div>

      {/* Row 3: ETF Flows + Holdings */}
      <div className="flex gap-2">
        <BtcEtfFlowCard data={holdingsQuery.data} isLoading={forceLoading || holdingsQuery.isLoading} />
        <BtcHoldingsCard data={holdingsQuery.data} isLoading={forceLoading || holdingsQuery.isLoading} />
      </div>
    </div>
  );
}

// ============ BTC Card Components ============

// Helper for formatting change badge
function ChangeBadge({ value, label }: { value: number | null | undefined; label: string }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-[#6B7280]">—</span>;
  }
  const isPositive = value >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const bgColor = isPositive ? "bg-[#DCFCE7]" : "bg-[#FEE2E2]";
  const textColor = isPositive ? "text-[#16A34A]" : "text-[#DC2626]";

  return (
    <span className="inline-flex items-center gap-1">
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded ${bgColor}`}>
        <span className={`text-xs font-medium tabular-nums ${textColor}`}>
          <span className="text-[10px]">{arrow}</span>{Math.abs(value).toFixed(2)}%
        </span>
      </span>
      <span className="text-[10px] text-[#9CA3AF]">{label}</span>
    </span>
  );
}

// Custom dot component for sparkline - only shows pulsing dot on last point
function SparklineDot(props: { cx?: number; cy?: number; index?: number; dataLength: number }) {
  const { cx, cy, index, dataLength } = props;
  if (cx === undefined || cy === undefined || index === undefined) return null;
  const isLast = index === dataLength - 1;
  if (!isLast) return null;

  return (
    <g style={{ opacity: 0, animation: "fadeIn 0.3s ease-out 1.5s forwards" }}>
      {/* Pulse ring */}
      <circle cx={cx} cy={cy} r={4} fill="#F7931A" className="animate-slow-pulse" />
      {/* Solid dot */}
      <circle cx={cx} cy={cy} r={2} fill="#F7931A" />
    </g>
  );
}

function BtcPriceCard({ data, isLoading }: { data?: BtcPriceData; isLoading: boolean }) {
  // Downsample sparkline for better display (take every 4th point from ~168 hourly points)
  // Then append current price as the last point
  const baseSparkline = data?.sparkline7d
    ? data.sparkline7d.filter((_, i) => i % 4 === 0)
    : [];
  const sparklineWithCurrentPrice = data?.price
    ? [...baseSparkline, data.price]
    : baseSparkline;
  const sparklineData = toSparklineData(sparklineWithCurrentPrice);

  const sparklineMin = sparklineData.length > 0 ? Math.min(...sparklineData.map(d => d.value)) : 0;
  const sparklineMax = sparklineData.length > 0 ? Math.max(...sparklineData.map(d => d.value)) : 0;

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      {isLoading ? (
        <div className="flex items-center justify-center h-20">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          {/* Row 1: Title + Price with Sparkline */}
          <div className="flex items-center gap-3">
            <div>
              <p className="font-semibold text-sm text-[#6B7280] mb-1">BTC 가격</p>
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {data?.price ? `$${data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
              </p>
            </div>
            {sparklineData.length > 0 && (
              <div className="w-25 h-10 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <YAxis domain={[sparklineMin * 0.99, sparklineMax * 1.01]} hide />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#F7931A"
                      fill="#F7931A"
                      fillOpacity={0.2}
                      strokeWidth={1.5}
                      dot={(props) => <SparklineDot {...props} dataLength={sparklineData.length} />}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Row 2: 1h / 24h / 7d changes as badges */}
          <div className="flex gap-2 mt-2">
            <ChangeBadge value={data?.change1h} label="1시간" />
            <ChangeBadge value={data?.change24h} label="24시간" />
            <ChangeBadge value={data?.change7d} label="7일" />
          </div>
        </>
      )}
    </div>
  );
}

function BtcMayerCard({ data, isLoading }: { data?: BtcIndicatorsData; isLoading: boolean }) {
  const mayer = data?.mayerMultiple;

  const interpretationLabel = mayer?.interpretation === "oversold" ? "저평가" :
    mayer?.interpretation === "overbought" ? "고평가" :
    mayer?.interpretation === "fair" ? "적정" : null;

  const badgeColor = mayer?.interpretation === "oversold" ? "bg-[#FEE2E2] text-[#DC2626]" :
    mayer?.interpretation === "overbought" ? "bg-[#DCFCE7] text-[#16A34A]" :
    "bg-[#FEF3C7] text-[#D97706]";

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      <p className="font-semibold text-sm text-[#6B7280] mb-2">Mayer Multiple</p>
      {isLoading ? (
        <div className="flex items-center justify-center h-[80px]">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold tabular-nums text-[#171717]">
              {mayer?.current?.toFixed(2) ?? "—"}
            </p>
            {interpretationLabel && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
                {interpretationLabel}
              </span>
            )}
          </div>
          <div className="relative mt-3 px-3">
            <div className="flex items-center">
              <img src="/assets/pixels/bear.png" alt="Bear" className="w-8 h-8 object-contain relative z-10 -mr-3" />
              <div className="flex-1 relative flex items-center">
                {/* Pixel-style bar with border */}
                <div className="w-full h-3 border-2 border-[#171717] flex overflow-hidden">
                  <div className="flex-1 bg-[#DC2626]" />
                  <div className="flex-1 bg-[#F59E0B]" />
                  <div className="flex-1 bg-[#16A34A]" />
                </div>
                {/* Position indicator */}
                {mayer?.current !== null && mayer?.current !== undefined && (
                  <div
                    className="absolute top-1/2 w-3 h-5 bg-white border-2 border-[#171717]"
                    style={{
                      left: `${Math.min(Math.max((mayer.current / 3) * 100, 0), 100)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                )}
              </div>
              <img src="/assets/pixels/bull.png" alt="Bull" className="w-8 h-8 object-contain relative z-10 -ml-3" />
            </div>
            {/* Scale labels - positioned below */}
            <div className="relative h-4 text-[10px] text-[#9CA3AF] mt-1 ml-5 mr-5">
              <span className="absolute left-0">0</span>
              <span className="absolute left-[33.3%] -translate-x-1/2">1.0</span>
              <span className="absolute left-[80%] -translate-x-1/2">2.4</span>
              <span className="absolute right-0">3.0</span>
            </div>
          </div>
          <div className="text-xs text-[#6B7280] mt-2">
            200일 MA <span className="font-semibold tabular-nums text-[#171717]">
              ${mayer?.ma200?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "—"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function BtcMiningCostCard({
  data,
  price,
  isLoading,
}: {
  data?: BtcIndicatorsData;
  price?: number | null;
  isLoading: boolean;
}) {
  const cost = data?.miningCost.productionCost;

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
      <p className="font-semibold text-sm text-[#6B7280] mb-1">채굴 원가</p>
      {isLoading ? (
        <div className="flex items-center justify-center h-10">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <p className="text-xl font-bold tabular-nums text-[#171717]">
            {cost ? `$${cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
          {price && cost && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
              price > cost ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"
            }`}>
              {price > cost ? "수익 구간" : "손실 구간"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function BtcMempoolCard({ data, isLoading }: { data?: BtcNetworkData; isLoading: boolean }) {
  const mempool = data?.mempool;

  const congestionConfig = {
    low: { label: "원활", bg: "bg-[#DCFCE7]", text: "text-[#16A34A]" },
    moderate: { label: "보통", bg: "bg-[#FEF3C7]", text: "text-[#D97706]" },
    high: { label: "혼잡", bg: "bg-[#FFEDD5]", text: "text-[#EA580C]" },
    extreme: { label: "정체", bg: "bg-[#FEE2E2]", text: "text-[#DC2626]" },
  };

  const config = mempool?.congestionLevel ? congestionConfig[mempool.congestionLevel] : null;

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
      <p className="font-semibold text-sm text-[#6B7280] mb-2">네트워크 상태</p>
      {isLoading ? (
        <div className="flex items-center justify-center h-12">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm text-[#6B7280]">
              권장 수수료: <span className="font-bold tabular-nums text-[#171717]">{mempool?.fees.economy ?? "—"} sat/vB</span>
            </p>
            {config && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${config.bg} ${config.text}`}>
                {config.label}
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] tabular-nums">
            대기 용량: {mempool?.pendingVsize ? `${mempool.pendingVsize.toFixed(1)} vMB` : "—"}
          </p>
        </>
      )}
    </div>
  );
}

function BtcHashrateCard({ data, isLoading }: { data?: BtcNetworkData; isLoading: boolean }) {
  const hashrate = data?.hashrate;
  const sparklineData = hashrate?.sparkline ? toSparklineDataWithDates(hashrate.sparkline) : [];
  const change = hashrate?.change30d;
  const isPositive = (change ?? 0) >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const badgeColor = isPositive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]";

  const sparklineMin = sparklineData.length > 0 ? Math.min(...sparklineData.map(d => d.value)) : 0;
  const sparklineMax = sparklineData.length > 0 ? Math.max(...sparklineData.map(d => d.value)) : 0;

  return (
    <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
      <p className="font-semibold text-sm text-[#6B7280] mb-1">해시레이트</p>
      {isLoading ? (
        <div className="flex items-center justify-center h-10">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <p className="text-xl font-bold tabular-nums text-[#171717]">
              {hashrate?.current ? hashrate.current.toFixed(0) : "—"}
            </p>
            <span className="text-sm text-[#6B7280]">EH/s</span>
            {change !== null && change !== undefined && (
              <>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
                  <span className="text-[10px]">{arrow}</span>
                  {Math.abs(change).toFixed(1)}%
                </span>
                <span className="text-[10px] text-[#9CA3AF]">30일</span>
              </>
            )}
          </div>
          {sparklineData.length > 0 && (
            <div className="w-full h-14 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <YAxis domain={[sparklineMin * 0.99, sparklineMax * 1.01]} hide />
                  <Tooltip
                    cursor={{ stroke: "#F7931A", strokeWidth: 1, strokeDasharray: "4 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const { date, value } = payload[0].payload;
                      return (
                        <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                          <p className="text-[#6B7280] mb-1">{date}</p>
                          <p className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#F7931A]" />
                            <span className="text-[#171717] font-medium tabular-nums">
                              {value.toFixed(0)} EH/s
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#F7931A"
                    fill="#F7931A"
                    fillOpacity={0.2}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, fill: "#F7931A" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BtcEtfFlowCard({ data, isLoading }: { data?: BtcHoldingsData; isLoading: boolean }) {
  const etfFlows = data?.etfFlows;

  return (
    <EtfFlowCard
      history={etfFlows?.history ?? []}
      today={etfFlows?.today ?? null}
      isLoading={isLoading}
      color="#F7931A"
    />
  );
}

function BtcHoldingsCard({ data, isLoading }: { data?: BtcHoldingsData; isLoading: boolean }) {
  const [activeTab, setActiveTab] = useState<"etf" | "company">("etf");

  return (
    <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-sm text-[#6B7280]">기관 보유량</p>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("etf")}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              activeTab === "etf"
                ? "bg-[#F7931A] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            ETF
          </button>
          <button
            onClick={() => setActiveTab("company")}
            className={`px-2 py-0.5 text-xs font-medium rounded ${
              activeTab === "company"
                ? "bg-[#F7931A] text-white"
                : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
            }`}
          >
            기업
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-30">
          <Spinner size="md" />
        </div>
      ) : activeTab === "etf" ? (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs text-[#9CA3AF] border-b border-[#E5E7EB] pb-1 mb-1">
            <span>#</span>
            <span>이름</span>
            <span className="text-right">보유량</span>
            <span className="text-right">가치</span>
          </div>
          {/* Data rows */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {data?.etfHoldings?.holdings?.map((h, i) => (
              <div key={h.ticker} className={`grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs py-1 ${i % 2 === 1 ? "bg-[#F9FAFB]" : ""}`}>
                <span className="text-[#9CA3AF]">{i + 1}.</span>
                <span className="text-[#171717] truncate">{h.issuer || h.ticker}</span>
                <span className="text-right tabular-nums text-[#171717]">
                  {formatCompactNumber(h.btc, 1)}
                </span>
                <span className="text-right tabular-nums text-[#171717]">
                  {formatUsd(h.usd, 1)}
                </span>
              </div>
            ))}
          </div>
          {/* Footer total */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-2">
            <div className="grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs items-baseline">
              <span></span>
              <span className="text-[#6B7280]">총 보유</span>
              <span className="text-right font-bold tabular-nums text-[#171717]">
                {data?.etfHoldings?.totalBtc
                  ? `${formatCompactNumber(data.etfHoldings.totalBtc, 2)} BTC`
                  : "—"}
              </span>
              <span className="text-right tabular-nums text-[#171717]">
                {data?.etfHoldings?.totalUsd
                  ? formatUsd(data.etfHoldings.totalUsd, 1)
                  : "—"}
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Header row */}
          <div className="grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs text-[#9CA3AF] border-b border-[#E5E7EB] pb-1 mb-1">
            <span>#</span>
            <span>이름</span>
            <span className="text-right">보유량</span>
            <span className="text-right">가치</span>
          </div>
          {/* Data rows */}
          <div className="max-h-36 overflow-y-auto pr-2">
            {data?.companyHoldings?.companies?.map((c, i) => (
              <div key={c.symbol} className={`grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs py-1 ${i % 2 === 1 ? "bg-[#F9FAFB]" : ""}`}>
                <span className="text-[#9CA3AF]">{i + 1}.</span>
                <span className="text-[#171717] truncate">{c.name}</span>
                <span className="text-right tabular-nums text-[#171717]">
                  {formatCompactNumber(c.holdings, 1)}
                </span>
                <span className="text-right tabular-nums text-[#171717]">
                  {formatUsd(c.value, 1)}
                </span>
              </div>
            ))}
          </div>
          {/* Footer total */}
          <div className="border-t border-[#E5E7EB] pt-2 mt-2">
            <div className="grid grid-cols-[24px_1fr_80px_80px] gap-2 text-xs items-baseline">
              <span></span>
              <span className="text-[#6B7280]">총 보유</span>
              <span className="text-right font-bold tabular-nums text-[#171717]">
                {data?.companyHoldings?.totalBtc
                  ? `${formatCompactNumber(data.companyHoldings.totalBtc, 2)} BTC`
                  : "—"}
              </span>
              <span className="text-right tabular-nums text-[#171717]">
                {data?.companyHoldings?.totalUsd
                  ? formatUsd(data.companyHoldings.totalUsd, 1)
                  : "—"}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EthContent({ data }: { data: EthData }) {
  const { data: tickers = [] } = useTicker();
  const ethTicker = tickers.find((t) => t.symbol.toUpperCase() === "ETH");
  const currentPrice = ethTicker?.price ?? null;
  const change7d = formatChange7d(data.price7d.change);

  return (
    <div className="space-y-2">
      {/* Row 1: Price */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
        {/* Header: Label + High/Low */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm text-[#6B7280]">ETH 가격</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <span className={`text-sm font-medium tabular-nums ${change7d.color}`}>
                <span className="text-[10px]">{change7d.arrow}</span> {change7d.value} <span className="text-[#9CA3AF]">7일</span>
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
                    <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
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

      {/* Row 2: Supply, Staking, Inflation cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: ETH Supply */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 flex flex-col justify-between min-h-[140px]">
          {/* Top row: Label + ETH logo */}
          <div className="flex items-start justify-between">
            <p className="font-semibold text-sm text-[#6B7280]">ETH 유통량</p>
            <Image
              src="/assets/pixels/ethereum.png"
              alt="ETH"
              width={48}
              height={48}
            />
          </div>
          {/* Bottom: Large number */}
          <p className="text-3xl font-bold tabular-nums text-[#171717]">
            {formatEthAmount(data.supply.circulating)}
            <span className="text-lg font-medium text-[#6B7280] ml-1">ETH</span>
          </p>
        </div>

        {/* Card 2: Staking */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 min-h-[140px]">
          <p className="font-semibold text-sm text-[#6B7280] mb-3">스테이킹</p>
          <div className="flex items-center justify-between">
            {/* Donut Chart */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                />
                {/* Progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#627EEA"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={
                    2 * Math.PI * 40 * (1 - (data.staking.stakingRatio ?? 0) / 100)
                  }
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold tabular-nums text-[#171717]">
                  {formatPercent(data.staking.stakingRatio, false, 1)}
                </span>
              </div>
            </div>
            {/* Stats */}
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {formatPercent(data.staking.stakingRatio, false, 1)}
              </p>
              <p className="text-sm text-[#6B7280]">
                {formatEthAmount(data.staking.totalStaked)} ETH
              </p>
              {data.staking.apy && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-[#16A34A] bg-[#DCFCE7] rounded">
                  APY {formatPercent(data.staking.apy * 100, false)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Inflation */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 min-h-[140px]">
          {/* Header: Label + 7일 indicator */}
          <div className="flex justify-between items-start mb-2">
            <p className="font-semibold text-sm text-[#6B7280]">
              {data.inflation?.isDeflationary ? "디플레이션" : "인플레이션"}
            </p>
            <span className="text-xs text-[#9CA3AF]">7일</span>
          </div>
          {/* Main value + Annual rate */}
          <div className="flex items-baseline gap-2">
            <p
              className={`text-2xl font-bold tabular-nums ${
                data.inflation?.netSupplyChange7d !== null
                  ? data.inflation.netSupplyChange7d >= 0
                    ? "text-[#0EA5E9]"
                    : "text-[#DC2626]"
                  : "text-[#171717]"
              }`}
            >
              {data.inflation?.netSupplyChange7d !== null
                ? `${data.inflation.netSupplyChange7d >= 0 ? "+" : ""}${formatCompactNumber(Math.abs(data.inflation.netSupplyChange7d), 1)}`
                : "—"}
              <span className="text-base font-medium text-[#6B7280] ml-1">ETH</span>
            </p>
            <span
              className={`text-sm font-medium tabular-nums ${
                data.inflation?.supplyGrowthPct !== null
                  ? data.inflation.supplyGrowthPct >= 0
                    ? "text-[#0EA5E9]"
                    : "text-[#DC2626]"
                  : "text-[#6B7280]"
              }`}
            >
              {data.inflation?.supplyGrowthPct !== null
                ? `${formatPercent(data.inflation.supplyGrowthPct)}/yr`
                : "—"}
            </span>
          </div>
          {/* Proportional bar */}
          {data.inflation?.issuance7d && data.inflation?.burn7d && (
            <div className="flex h-3 rounded-full overflow-hidden mt-3">
              <div
                className="bg-[#0EA5E9]"
                style={{
                  width: `${(data.inflation.issuance7d / (data.inflation.issuance7d + data.inflation.burn7d)) * 100}%`,
                }}
              />
              <div
                className="bg-[#DC2626]"
                style={{
                  width: `${(data.inflation.burn7d / (data.inflation.issuance7d + data.inflation.burn7d)) * 100}%`,
                }}
              />
            </div>
          )}
          {/* Labels */}
          <div className="flex justify-between mt-2 text-sm">
            <div>
              <span className="text-[#6B7280]">발행 </span>
              <span className="text-[#0EA5E9] font-medium tabular-nums">
                +{formatEthAmount(data.inflation?.issuance7d, 1)}
              </span>
            </div>
            <div>
              <span className="text-[#6B7280]">소각 </span>
              <span className="text-[#DC2626] font-medium tabular-nums">
                -{formatCompactNumber(data.inflation?.burn7d, 1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: TVL + Stablecoins (side by side) */}
      <div className="flex gap-2">
        <TvlChart data={data.l2Tvl} />
        <StablecoinsChart data={data.l2Stablecoins} />
      </div>

      {/* Row 4: ETF Flows + Holdings (side by side) */}
      <div className="flex gap-2">
        <EtfFlowCard history={data.etfFlows.history} today={data.etfFlows.today} />
        <HoldingsCard etfHoldings={data.etfHoldings} datHoldings={data.datHoldings} />
      </div>
    </div>
  );
}

function SolContent({ data }: { data: SolData }) {
  const { data: tickers = [] } = useTicker();
  const solTicker = tickers.find((t) => t.symbol.toUpperCase() === "SOL");
  const currentPrice = solTicker?.price ?? null;
  const change7d = formatChange7d(data.price7d.change);

  return (
    <div className="space-y-2">
      {/* Row 1: Price */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-3">
        {/* Header: Label + High/Low */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-semibold text-sm text-[#6B7280]">SOL 가격</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {currentPrice ? `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
              <span className={`text-sm font-medium tabular-nums ${change7d.color}`}>
                <span className="text-[10px]">{change7d.arrow}</span> {change7d.value} <span className="text-[#9CA3AF]">7일</span>
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
              <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
              <Tooltip
                cursor={{ stroke: "#9945FF", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as { value: number; date: string };
                  return (
                    <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                      <p className="text-[#6B7280] mb-1">{item.date}</p>
                      <p className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#9945FF]" />
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
                stroke="#9945FF"
                fill="#9945FF"
                fillOpacity={0.15}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Supply, Staking, Inflation cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Card 1: SOL Supply */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 flex flex-col justify-between min-h-[140px]">
          {/* Top row: Label + SOL logo */}
          <div className="flex items-start justify-between">
            <p className="font-semibold text-sm text-[#6B7280]">SOL 유통량</p>
            <Image
              src="/assets/pixels/solana.png"
              alt="SOL"
              width={48}
              height={48}
            />
          </div>
          {/* Bottom: Large number */}
          <p className="text-3xl font-bold tabular-nums text-[#171717]">
            {formatMillions(data.supply.circulating)}
            <span className="text-lg font-medium text-[#6B7280] ml-1">SOL</span>
          </p>
        </div>

        {/* Card 2: Staking */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 min-h-[140px]">
          <p className="font-semibold text-sm text-[#6B7280] mb-3">스테이킹</p>
          <div className="flex items-center justify-between">
            {/* Donut Chart - Purple for SOL */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                {/* Background track */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="12"
                />
                {/* Progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#9945FF"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={
                    2 * Math.PI * 40 * (1 - (data.staking.stakingPct ?? 0) / 100)
                  }
                />
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-semibold tabular-nums text-[#171717]">
                  {data.staking.stakingPct ? `${data.staking.stakingPct.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
            {/* Stats */}
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-[#171717]">
                {data.staking.stakingPct ? `${data.staking.stakingPct.toFixed(1)}%` : "—"}
              </p>
              <p className="text-sm text-[#6B7280]">
                {formatMillions(data.staking.staked)} SOL
              </p>
              {data.staking.apy && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium text-[#16A34A] bg-[#DCFCE7] rounded">
                  APY {formatPercent(data.staking.apy * 100, false)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Inflation */}
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 min-h-[140px] flex flex-col justify-between">
          <p className="font-semibold text-sm text-[#6B7280]">인플레이션</p>
          {/* Annual Rate */}
          <p className="text-2xl font-bold tabular-nums text-[#171717]">
            {data.inflation.annualRatePct ? `${data.inflation.annualRatePct.toFixed(2)}%` : "—"}
            <span className="text-sm font-medium text-[#6B7280] ml-1">/yr</span>
          </p>
        </div>
      </div>

      {/* Row 3: TVL + Stablecoins */}
      <div className="flex gap-2">
        {/* TVL Card */}
        <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
          <div className="mb-2">
            <p className="font-semibold text-sm text-[#6B7280]">총 예치량</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold tabular-nums text-[#171717]">
                {formatBillions(data.tvl.total)}
              </p>
              {data.tvl.change7d !== null && (
                <span className={`text-xs font-medium tabular-nums ${data.tvl.change7d >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  <span className="text-[9px]">{data.tvl.change7d >= 0 ? "▲" : "▼"}</span> {Math.abs(data.tvl.change7d).toFixed(2)}% <span className="text-[#9CA3AF]">7일</span>
                </span>
              )}
            </div>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={toSparklineDataWithDates(data.tvl.sparkline)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <YAxis domain={["dataMin * 0.95", "dataMax * 1.05"]} hide />
                <Tooltip
                  cursor={{ stroke: "#171717", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as { value: number; date: string };
                    return (
                      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                        <p className="text-[#6B7280] mb-1">{item.date}</p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#171717]" />
                          <span className="text-[#171717] font-medium tabular-nums">
                            ${(item.value / 1e9).toFixed(2)}B
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#171717"
                  fill="#171717"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stablecoins Card */}
        <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-3">
          <div className="mb-2">
            <p className="font-semibold text-sm text-[#6B7280]">스테이블코인</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold tabular-nums text-[#171717]">
                {formatBillions(data.stablecoins.total)}
              </p>
              {data.stablecoins.change7d !== null && (
                <span className={`text-xs font-medium tabular-nums ${data.stablecoins.change7d >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  <span className="text-[9px]">{data.stablecoins.change7d >= 0 ? "▲" : "▼"}</span> {Math.abs(data.stablecoins.change7d).toFixed(2)}% <span className="text-[#9CA3AF]">7일</span>
                </span>
              )}
            </div>
          </div>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={toSparklineDataWithDates(data.stablecoins.sparkline)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <YAxis domain={["dataMin * 0.95", "dataMax * 1.05"]} hide />
                <Tooltip
                  cursor={{ stroke: "#00FFA3", strokeWidth: 1, strokeDasharray: "4 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as { value: number; date: string };
                    return (
                      <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                        <p className="text-[#6B7280] mb-1">{item.date}</p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#00FFA3]" />
                          <span className="text-[#171717] font-medium tabular-nums">
                            ${(item.value / 1e9).toFixed(2)}B
                          </span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#00FFA3"
                  fill="#00FFA3"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: ETF Flows + Holdings */}
      <div className="flex gap-2">
        <EtfFlowCard history={data.etfFlows.history} today={data.etfFlows.today} color="#9945FF" />
        <SolHoldingsCard etfHoldings={data.etfHoldings} datHoldings={data.datHoldings} />
      </div>
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
          {formatPercent(change)} (7일)
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
            오늘: {today >= 0 ? "+" : "-"}{formatUsd(Math.abs(today), 0)}
          </span>
        )}
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#6B7280" }} />
            <YAxis hide />
            <Tooltip
              cursor={false}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const value = payload[0].payload.value;
                return (
                  <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                    <p className="text-[#6B7280] mb-1">{label}</p>
                    <p className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${value >= 0 ? "bg-[#627EEA]" : "bg-[#DC2626]"}`} />
                      <span className={`font-medium tabular-nums ${value >= 0 ? "text-[#627EEA]" : "text-[#DC2626]"}`}>
                        {value >= 0 ? "+" : "-"}{formatUsd(Math.abs(value), 0)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Bar dataKey="value" radius={[2, 2, 2, 2]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? color : "#DC2626"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
