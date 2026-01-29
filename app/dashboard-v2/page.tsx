"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useV2Metrics } from "@/lib/hooks/use-v2-metrics";

// RWA by category placeholder (from rwa.xyz CSV - will be dynamic after admin CSV upload)
const rwaByCategory = [
  { name: "US Treasury Debt", value: 8.89e9 },
  { name: "Commodities", value: 4.48e9 },
  { name: "Private Credit", value: 2.79e9 },
  { name: "Institutional Alt Funds", value: 2.34e9 },
  { name: "Corporate Bonds", value: 1.64e9 },
  { name: "non-US Gov Debt", value: 1.41e9 },
  { name: "Public Equity", value: 1.32e9 },
  { name: "Private Equity", value: 0.40e9 },
  { name: "Other", value: 0.20e9 },
];
const rwaCategoryTotal = rwaByCategory.reduce((sum, c) => sum + c.value, 0);

// Formatting helpers
function formatCurrency(value: number | null, decimals = 0): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatBillions(value: number | null): string {
  if (value === null) return "—";
  // Handle raw USD values (convert to billions)
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  // Handle values already in billions (legacy)
  if (value >= 1) return `$${value.toFixed(1)}B`;
  return `$${(value * 1000).toFixed(0)}M`;
}

function formatCompact(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}억`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  return value.toLocaleString();
}

function formatEth(value: number | null): string {
  if (value === null) return "—";
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatPercent(value: number | null, showSign = true): string {
  if (value === null) return "—";
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

// Transform ETF flow data for stacked bar chart
function transformFlowData(history: Array<{ date: string; value: number }>) {
  return history.map((d) => ({
    date: d.date,
    positive: d.value > 0 ? d.value : 0,
    negative: d.value < 0 ? d.value : 0,
  }));
}

// Loading skeleton component
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function DashboardV2() {
  const [chatOpen, setChatOpen] = useState(false);
  const { data: metrics, isLoading, error, refetch } = useV2Metrics();

  // Calculate derived values
  const ethBtcRatio = metrics?.ethPrice && metrics?.btcPrice
    ? metrics.ethPrice / metrics.btcPrice
    : null;

  // Calculate net supply change (issuance - burn) for 7d
  // Positive = inflationary (supply grows), Negative = deflationary (supply shrinks)
  const netSupplyChange7d = metrics?.ethBurnIssuanceHistory.reduce(
    (sum, d) => sum + (d.issuance - d.burn),
    0
  ) ?? null;

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Left: Logo + Pixel Mascots */}
          <div className="flex flex-1 items-center gap-3">
            <Image
              src="/assets/logo-full.png"
              alt="얌얌코인"
              width={120}
              height={36}
              className="object-contain"
            />
            <div className="flex items-center gap-1">
              <Image
                src="/assets/pixels/doge.png"
                alt="Doge"
                width={48}
                height={48}
              />
              <Image
                src="/assets/pixels/pepe.png"
                alt="Pepe"
                width={48}
                height={48}
              />
              <Image
                src="/assets/pixels/robot.png"
                alt="Robot"
                width={48}
                height={48}
              />
            </div>
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-6 h-full">
            <Link
              href="/dashboard-v2"
              className="relative flex items-center h-full px-1 text-sm font-semibold text-[#171717]"
            >
              시장지표
              <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#E7F60E]" />
            </Link>
            <Link
              href="#"
              className="flex items-center gap-1.5 h-full px-1 text-sm font-medium text-[#6B7280]"
            >
              일정
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-xs font-bold text-white">
                2
              </span>
            </Link>
            <Link
              href="#"
              className="flex items-center h-full px-1 text-sm font-medium text-[#6B7280]"
            >
              About
            </Link>
          </nav>

          {/* Right: Social + Admin */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <a href="#" className="flex h-8 w-8 items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#FF0000]">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a href="#" className="flex h-8 w-8 items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#0088CC]">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </a>
            <button className="rounded-lg bg-[#E7F60E] px-4 py-2 text-sm font-semibold text-[#171717]">
              Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-4">
        {/* Error State */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-red-700 text-sm mb-2">데이터를 불러오는데 실패했습니다: {error}</p>
            <button
              onClick={refetch}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* Data content - show when not loading */}
        {!isLoading && (
        <>
        {/* ETH Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">이더리움</h2>

          {/* Row 1: ETH Price Card - Full Width */}
          <div className="mb-3 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-pixel text-sm text-[#6B7280]">
                  이더리움 현재가
                </p>
                <p className="text-4xl font-bold text-[#171717] tabular-nums tracking-tight">
                  {formatCurrency(metrics?.ethPrice ?? null)}{" "}
                  <span className={`text-lg ${(metrics?.ethPriceChange ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {formatPercent(metrics?.ethPriceChange ?? null)}
                  </span>
                </p>
              </div>
              <Image
                src="/assets/pixels/ethereum-original.png"
                alt="ETH"
                width={64}
                height={64}
              />
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics?.ethPriceHistory ?? []}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={["dataMin - 100", "dataMax + 100"]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171717",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number | undefined) =>
                      value !== undefined ? [`$${value}`, "Price"] : ["", ""]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#B8C20A"
                    strokeWidth={2}
                    fill="#E7F60E"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Supply + TVL - 50/50 */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            {/* Supply Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-pixel text-sm text-[#6B7280]">공급량</p>
                  <p className="text-2xl font-extrabold text-[#171717] tabular-nums tracking-tight">
                    {formatCompact(metrics?.ethSupply ?? null)} ETH
                  </p>
                  <p className="text-xs font-semibold text-[#6B7280]">
                    (7d)
                  </p>
                </div>
                <div className="h-20 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.ethSupplyHistory ?? []}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#0D9488"
                        strokeWidth={2}
                        fill="#0D9488"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* TVL Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-pixel text-sm text-[#6B7280]">
                    총 예치량 (TVL)
                  </p>
                  <p className="text-2xl font-extrabold text-[#171717] tabular-nums tracking-tight">
                    {formatBillions(metrics?.ethTvl ?? null)}
                  </p>
                  <p className="text-xs font-semibold text-[#6B7280]">
                    (7d)
                  </p>
                </div>
                <div className="h-20 w-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics?.ethTvlHistory ?? []}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366F1"
                        strokeWidth={2}
                        fill="#6366F1"
                        fillOpacity={0.2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Burn vs Issuance - Full Width */}
          <div className="mb-3 rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="font-pixel text-sm text-[#6B7280]">
                소각 vs 발행 7d
              </p>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#E7F60E] rounded-sm"></span>
                  Burn
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-[#9CA3AF] rounded-sm"></span>
                  Issuance
                </span>
              </div>
            </div>
            <p className={`text-xl font-extrabold tabular-nums tracking-tight mb-2 ${(netSupplyChange7d ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
              {netSupplyChange7d !== null ? `${netSupplyChange7d >= 0 ? "+" : ""}${netSupplyChange7d.toLocaleString()} ETH` : "—"}
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics?.ethBurnIssuanceHistory ?? []} barGap={2}>
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#6B7280" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#171717",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    formatter={(value: number | undefined) =>
                      value !== undefined ? [`${value} ETH`, ""] : ["", ""]
                    }
                  />
                  <Bar dataKey="burn" fill="#E7F60E" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="issuance"
                    fill="#9CA3AF"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4: ETH Holdings - Full Width */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-pixel text-sm text-[#6B7280] mb-3">
              기관 보유량
            </p>

            {/* Segmented bar representing 100% supply */}
            <div className="flex h-6 w-full rounded-full overflow-hidden bg-[#E5E7EB] mb-3">
              {/* ETF segment */}
              <div
                className="h-full bg-[#E7F60E]"
                style={{ width: `${Math.max(metrics?.etfHoldingsPct ?? 0, 0.5)}%` }}
              />
              {/* DAT segment */}
              <div
                className="h-full bg-[#0D9488]"
                style={{ width: `${Math.max(metrics?.datHoldingsPct ?? 0, 0.5)}%` }}
              />
            </div>

            {/* Legend with ETH amounts */}
            <div className="flex justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#E7F60E]" />
                  <span className="font-semibold">ETF</span>
                  <span className="text-[#171717] font-semibold tabular-nums">
                    {formatEth(metrics?.etfHoldingsEth ?? null)} ETH
                  </span>
                  <span className="text-[#6B7280]">
                    ({metrics?.etfHoldingsPct != null ? `${metrics.etfHoldingsPct.toFixed(2)}%` : "—"})
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-[#0D9488]" />
                  <span className="font-semibold">DAT</span>
                  <span className="text-[#171717] font-semibold tabular-nums">
                    {formatEth(metrics?.datHoldingsEth ?? null)} ETH
                  </span>
                  <span className="text-[#6B7280]">
                    ({metrics?.datHoldingsPct != null ? `${metrics.datHoldingsPct.toFixed(2)}%` : "—"})
                  </span>
                </span>
              </div>
              <span className="text-[#9CA3AF]">
                총 공급량: {formatCompact(metrics?.ethSupply ?? null)} ETH
              </span>
            </div>
          </div>
        </section>

        {/* RWA Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">RWA</h2>

          {/* Row 1: RWA Total + Chain breakdown - 50/50 */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            {/* RWA Total Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-pixel text-sm text-[#6B7280]">RWA 총액</p>
                  <p className="text-3xl font-extrabold text-[#171717] tabular-nums tracking-tight">
                    {formatBillions(metrics?.rwaTotal ?? null)}
                  </p>
                </div>
                <Image
                  src="/assets/pixels/bank.png"
                  alt="Bank"
                  width={80}
                  height={80}
                />
              </div>
            </div>

            {/* Chain RWA Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-pixel text-sm text-[#6B7280] mb-3">
                체인별 RWA
              </p>
              {/* Horizontal bars - dynamic from metrics */}
              <div className="space-y-2 text-sm">
                {(() => {
                  const chainData = metrics?.rwaByChain ?? {};
                  const chains = Object.entries(chainData).sort((a, b) => b[1] - a[1]).slice(0, 4);
                  const maxValue = chains[0]?.[1] ?? 1;
                  return chains.map(([chain, value]) => (
                    <div key={chain} className="flex items-center gap-2">
                      <span className="w-16 font-semibold text-[#171717] truncate">
                        {chain}
                      </span>
                      <div className="flex-1">
                        <div
                          className="h-3 bg-[#E7F60E] rounded-full"
                          style={{ width: `${(value / maxValue) * 100}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-semibold text-[#171717]">
                        ${(value / 1e9).toFixed(1)}B
                      </span>
                    </div>
                  ));
                })()}
                {Object.keys(metrics?.rwaByChain ?? {}).length === 0 && (
                  <p className="text-[#6B7280] text-center">데이터 없음</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Category RWA - Full Width (placeholder from rwa.xyz CSV until admin upload) */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-pixel text-sm text-[#6B7280]">
                카테고리별 RWA
              </p>
              <span className="text-xs text-[#9CA3AF]">rwa.xyz 기준</span>
            </div>
            {/* Horizontal bars with background - using placeholder data */}
            <div className="space-y-2 text-sm">
              {rwaByCategory.slice(0, 6).map((category) => {
                const maxValue = rwaByCategory[0].value;
                const pct = (category.value / rwaCategoryTotal) * 100;
                return (
                  <div key={category.name} className="flex items-center gap-2">
                    <span className="w-28 font-semibold text-[#171717] truncate">
                      {category.name}
                    </span>
                    <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E7F60E] rounded-full"
                        style={{ width: `${(category.value / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-semibold text-[#171717]">
                      ${(category.value / 1e9).toFixed(1)}B{" "}
                      <span className="text-[#6B7280] font-normal">({pct.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ETF Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">ETF 자금흐름</h2>

          {/* Row 1: ETH + BTC ETF Flow - 50/50 */}
          <div className="grid grid-cols-2 gap-3">
            {/* ETH ETF Flow Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2">
                <p className="font-pixel text-sm text-[#6B7280]">
                  ETH ETF (7d)
                </p>
                {(() => {
                  const weeklyTotal = metrics?.etfFlowEthHistory?.reduce((sum, d) => sum + d.value, 0) ?? null;
                  const formatFlow = (v: number) => {
                    const abs = Math.abs(v);
                    const sign = v >= 0 ? "+" : "-";
                    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
                    return `${sign}$${abs.toFixed(0)}M`;
                  };
                  return (
                    <p className={`text-xl font-extrabold tabular-nums tracking-tight ${(weeklyTotal ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {weeklyTotal != null ? formatFlow(weeklyTotal) : "—"}
                    </p>
                  );
                })()}
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transformFlowData(metrics?.etfFlowEthHistory ?? [])} stackOffset="sign" margin={{ left: 0, right: 5 }}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#6B7280" }}
                      tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
                      width={35}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = (payload[0]?.value as number) || (payload[1]?.value as number) || 0;
                          return (
                            <div className="rounded bg-[#171717] px-2 py-1 text-xs text-white shadow">
                              <p>{label}</p>
                              <p className={value >= 0 ? "text-[#E7F60E]" : "text-[#DC2626]"}>
                                {value >= 0 ? "+" : ""}${Math.abs(value).toFixed(1)}M
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar dataKey="positive" fill="#E7F60E" stackId="stack" barSize={12} />
                    <Bar dataKey="negative" fill="#DC2626" stackId="stack" barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BTC ETF Flow Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2">
                <p className="font-pixel text-sm text-[#6B7280]">
                  BTC ETF (7d)
                </p>
                {(() => {
                  const weeklyTotal = metrics?.etfFlowBtcHistory?.reduce((sum, d) => sum + d.value, 0) ?? null;
                  const formatFlow = (v: number) => {
                    const abs = Math.abs(v);
                    const sign = v >= 0 ? "+" : "-";
                    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}B`;
                    return `${sign}$${abs.toFixed(0)}M`;
                  };
                  return (
                    <p className={`text-xl font-extrabold tabular-nums tracking-tight ${(weeklyTotal ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {weeklyTotal != null ? formatFlow(weeklyTotal) : "—"}
                    </p>
                  );
                })()}
              </div>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transformFlowData(metrics?.etfFlowBtcHistory ?? [])} stackOffset="sign" margin={{ left: 0, right: 5 }}>
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#6B7280" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#6B7280" }}
                      tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
                      width={40}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const value = (payload[0]?.value as number) || (payload[1]?.value as number) || 0;
                          return (
                            <div className="rounded bg-[#171717] px-2 py-1 text-xs text-white shadow">
                              <p>{label}</p>
                              <p className={value >= 0 ? "text-[#E7F60E]" : "text-[#DC2626]"}>
                                {value >= 0 ? "+" : ""}${Math.abs(value).toFixed(1)}M
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar dataKey="positive" fill="#E7F60E" stackId="stack" barSize={12} />
                    <Bar dataKey="negative" fill="#DC2626" stackId="stack" barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {/* MARKET Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">MARKET</h2>

          {/* Row 1: 5 Metric Cards */}
          <div className="mb-3 grid grid-cols-5 gap-3">
            {/* BTC Price */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">
                비트코인 현재가
              </p>
              <div className="flex justify-center">
                <Image
                  src="/assets/pixels/bitcoin.png"
                  alt="Bitcoin"
                  width={56}
                  height={56}
                />
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#171717] tabular-nums tracking-tight">
                  {formatCurrency(metrics?.btcPrice ?? null)}
                </p>
                <p className={`text-xs font-semibold ${(metrics?.btcPriceChange ?? 0) >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                  {formatPercent(metrics?.btcPriceChange ?? null)}
                </p>
              </div>
            </div>

            {/* BTC Dominance */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">BTC 도미넌스</p>
              <div className="flex justify-center">
                <Image
                  src="/assets/pixels/pepe.png"
                  alt="Pepe"
                  width={56}
                  height={56}
                />
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#171717] tabular-nums tracking-tight">
                  {metrics?.btcDominance !== null ? `${metrics?.btcDominance?.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs font-semibold text-[#6B7280]">—</p>
              </div>
            </div>

            {/* Fear & Greed */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">
                공포 탐욕 지수
              </p>
              <div className="flex justify-center">
                <div className="relative">
                  {/* Half circle gauge with 4 segments */}
                  <svg width="96" height="52" viewBox="0 0 96 52">
                    {/* Red segment: Extreme Fear (0-25) */}
                    <path
                      d="M 8 44 A 40 40 0 0 1 18.7 16.7"
                      fill="none"
                      stroke="#DC2626"
                      strokeWidth="10"
                    />
                    {/* Orange segment: Fear (25-50) */}
                    <path
                      d="M 20.2 15.2 A 40 40 0 0 1 47.3 4"
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="10"
                    />
                    {/* Lime segment: Greed (50-75) */}
                    <path
                      d="M 49.4 4 A 40 40 0 0 1 76.3 15.7"
                      fill="none"
                      stroke="#E7F60E"
                      strokeWidth="10"
                    />
                    {/* Green segment: Extreme Greed (75-100) */}
                    <path
                      d="M 77.7 17.2 A 40 40 0 0 1 88 44"
                      fill="none"
                      stroke="#16A34A"
                      strokeWidth="10"
                    />
                    {/* Needle: value/100 * 180 - 90 degrees rotation */}
                    <line
                      x1="48"
                      y1="44"
                      x2="48"
                      y2="10"
                      stroke="#1F2937"
                      strokeWidth="2"
                      strokeLinecap="round"
                      transform={`rotate(${((metrics?.fearGreed ?? 50) / 100) * 180 - 90}, 48, 44)`}
                    />
                    <circle cx="48" cy="44" r="4" fill="#1F2937" />
                  </svg>
                  {/* Labels below gauge */}
                  <div className="flex justify-between px-1">
                    <span className="text-xs text-[#6B7280] font-medium">0</span>
                    <span className="text-xs text-[#6B7280] font-medium">100</span>
                  </div>
                </div>
              </div>
              <p className={`text-lg font-extrabold tabular-nums tracking-tight ${(metrics?.fearGreed ?? 50) >= 50 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                {metrics?.fearGreed !== null ? `${metrics?.fearGreed} ${(metrics?.fearGreed ?? 50) >= 50 ? "탐욕" : "공포"}` : "—"}
              </p>
            </div>

            {/* ETH/BTC Ratio */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">ETH/BTC 비율</p>
              <div className="flex justify-center">
                <div className="relative w-14 h-14">
                  <Image
                    src="/assets/pixels/ethereum.png"
                    alt="ETH"
                    width={40}
                    height={40}
                    className="absolute top-0 left-0 z-10"
                  />
                  <Image
                    src="/assets/pixels/bitcoin.png"
                    alt="BTC"
                    width={40}
                    height={40}
                    className="absolute bottom-0 right-0"
                  />
                </div>
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#171717] tabular-nums tracking-tight">
                  {ethBtcRatio !== null ? ethBtcRatio.toFixed(4) : "—"}
                </p>
                <p className="text-xs font-semibold text-[#6B7280]">—</p>
              </div>
            </div>

            {/* Stablecoin Market Cap */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">
                스테이블코인 시가총액
              </p>
              <div className="flex justify-center">
                <div className="relative w-14 h-14">
                  <Image
                    src="/assets/pixels/usdt.png"
                    alt="USDT"
                    width={40}
                    height={40}
                    className="absolute top-0 left-0 z-10"
                  />
                  <Image
                    src="/assets/pixels/usdc.png"
                    alt="USDC"
                    width={40}
                    height={40}
                    className="absolute bottom-0 right-0"
                  />
                </div>
              </div>
              <div>
                <p className="text-lg font-extrabold text-[#171717] tabular-nums tracking-tight">
                  {formatBillions(metrics?.stablecoinTotal ?? null)}
                </p>
                <p className="text-xs font-semibold text-[#6B7280]">—</p>
              </div>
            </div>
          </div>

          {/* Row 2: Stablecoin by Chain - Full Width */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-pixel text-sm text-[#6B7280] mb-3">
              체인별 스테이블코인
            </p>
            {/* Segmented bar - dynamic based on stablecoinByChain */}
            {(() => {
              const chainData = metrics?.stablecoinByChain ?? {};
              const total = Object.values(chainData).reduce((sum, v) => sum + v, 0);
              const chains = ["Ethereum", "Tron", "BSC", "Arbitrum", "Solana"];
              const colors = ["#E7F60E", "#0D9488", "#6366F1", "#9CA3AF", "#D1D5DB"];
              return (
                <>
                  <div className="flex h-4 w-full rounded-full overflow-hidden mb-3">
                    {chains.map((chain, idx) => {
                      const value = chainData[chain] ?? 0;
                      const pct = total > 0 ? (value / total) * 100 : 0;
                      return pct > 0 ? (
                        <div key={chain} style={{ width: `${pct}%`, backgroundColor: colors[idx] }} />
                      ) : null;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {chains.map((chain, idx) => {
                      const value = chainData[chain] ?? 0;
                      const pct = total > 0 ? (value / total) * 100 : 0;
                      return value > 0 ? (
                        <span key={chain} className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[idx] }} />
                          <span className="font-semibold">{chain}</span>
                          <span className="text-[#6B7280]">${value.toFixed(1)}B ({pct.toFixed(0)}%)</span>
                        </span>
                      ) : null;
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        </section>
        </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-6">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <p>© 2026 얌얌코인</p>
            <p>Last updated: {metrics?.lastUpdated ?? "—"}</p>
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Data: CoinGecko, DeFiLlama, Dune Analytics, Farside Investors
          </p>
        </div>
      </footer>

      {/* Floating Chat */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end">
        {/* Chat Panel */}
        {chatOpen && (
          <div className="mb-3 w-80 bg-white rounded-xl shadow-xl border border-[#E5E7EB] overflow-hidden">
            {/* Header */}
            <div className="bg-[#E7F60E] px-4 py-3 flex items-center justify-between">
              <span className="font-semibold text-[#171717]">얌얌 채팅</span>
              <button
                onClick={() => setChatOpen(false)}
                className="text-[#171717] hover:opacity-70"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
            {/* Messages */}
            <div className="h-64 p-4 bg-[#F6F7F9] overflow-y-auto">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#E7F60E] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">🐕</span>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 text-sm shadow-sm">
                    안녕하세요! 얌얌코인 커뮤니티에 오신 것을 환영합니다 🎉
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#0D9488] flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">🐸</span>
                  </div>
                  <div className="bg-white rounded-lg px-3 py-2 text-sm shadow-sm">
                    오늘 ETH 상승세 좋네요!
                  </div>
                </div>
              </div>
            </div>
            {/* Input */}
            <div className="p-3 border-t border-[#E5E7EB]">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#E7F60E]"
                />
                <button className="px-3 py-2 bg-[#E7F60E] rounded-lg hover:bg-[#d4e30d]">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#171717]">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Bubble Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 bg-[#E7F60E] rounded-full shadow-lg flex items-center justify-center hover:bg-[#d4e30d] transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#171717]">
            {chatOpen ? (
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            ) : (
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
