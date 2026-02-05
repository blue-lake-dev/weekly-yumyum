"use client";

import Image from "next/image";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { QuickStatCard } from "@/components/ui/QuickStatCard";
import { FearGreedGauge } from "@/components/ui/FearGreedGauge";
import { DominanceBar } from "@/components/ui/DominanceBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useQuickStats } from "@/lib/hooks/use-quick-stats";
import { formatPercent, formatUsd } from "@/lib/utils/format";

export function QuickStats() {
  const { data, isLoading } = useQuickStats();

  if (isLoading || !data) {
    return (
      <section className="mb-3">
        <h2 className="mb-3 font-bold text-lg text-[#171717]">빠른 현황</h2>
        <div className="flex gap-2 overflow-x-auto lg:overflow-visible scrollbar-hide">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              className="h-32 min-w-[160px] flex-shrink-0 rounded-xl"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-3">
      <h2 className="mb-3 font-bold text-lg text-[#171717]">얌얌 시황</h2>

      {/* Horizontal scroll container with fade on mobile */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto scrollbar-touch-hide">
          {/* Card 1: Total Market Cap */}
          <QuickStatCard label="암호화폐 시총">
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <p className="text-2xl font-semibold text-[#171717] tabular-nums tracking-tight">
                  {formatUsd(data.totalMarketCap.value, 2)}
                </p>
                {data.totalMarketCap.change24h !== null && (
                  <p className="text-sm tabular-nums">
                    <span
                      className={`font-semibold ${
                        data.totalMarketCap.change24h >= 0
                          ? "text-[#16A34A]"
                          : "text-[#DC2626]"
                      }`}
                    >
                      <span className="text-[10px]">
                        {data.totalMarketCap.change24h >= 0 ? "▲" : "▼"}
                      </span>{" "}
                      {formatPercent(
                        Math.abs(data.totalMarketCap.change24h),
                        false,
                      )}
                    </span>
                    <span className="text-[#9CA3AF] ml-1">24시간</span>
                  </p>
                )}
              </div>
            </div>
          </QuickStatCard>

          {/* Card 2: Fear & Greed */}
          <QuickStatCard label="공포 & 탐욕">
            <div className="flex flex-col items-center">
              <FearGreedGauge value={data.fearGreed.value} size="md" />
              <p
                className={`mt-1 text-sm font-semibold ${
                  (data.fearGreed.value ?? 50) < 25
                    ? "text-[#DC2626]"
                    : (data.fearGreed.value ?? 50) < 45
                      ? "text-[#F97316]"
                      : (data.fearGreed.value ?? 50) < 55
                        ? "text-[#C4D00B]"
                        : (data.fearGreed.value ?? 50) < 75
                          ? "text-[#84CC16]"
                          : "text-[#22C55E]"
                }`}
              >
                {data.fearGreed.label}
              </p>
            </div>
          </QuickStatCard>

          {/* Card 3: Dominance */}
          <QuickStatCard label="BTC Dominance" className="min-w-[180px]">
            <div className="flex-1 flex flex-col justify-center space-y-1.5">
              {/* BTC row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#F7931A]" />
                  <span className="text-xs text-[#6B7280]">BTC</span>
                </div>
                <span className="text-sm font-semibold text-[#171717] tabular-nums">
                  {formatPercent(data.dominance.btc, false, 1)}
                </span>
              </div>
              {/* ETH row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#627EEA]" />
                  <span className="text-xs text-[#6B7280]">ETH</span>
                </div>
                <span className="text-sm font-semibold text-[#171717] tabular-nums">
                  {formatPercent(data.dominance.eth, false, 1)}
                </span>
              </div>
              {/* Others row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                  <span className="text-xs text-[#6B7280]">Others</span>
                </div>
                <span className="text-sm font-semibold text-[#171717] tabular-nums">
                  {formatPercent(data.dominance.others, false, 1)}
                </span>
              </div>
              {/* Segmented bar */}
              <div className="pt-1">
                <DominanceBar
                  btc={data.dominance.btc}
                  eth={data.dominance.eth}
                  others={data.dominance.others}
                />
              </div>
            </div>
          </QuickStatCard>

          {/* Card 4: Stablecoins */}
          <QuickStatCard label="스테이블코인 시총" className="min-w-[180px]">
            <div className="flex flex-col flex-1">
              <div>
                <p className="text-2xl font-semibold text-[#171717] tabular-nums tracking-tight">
                  {formatUsd(data.stablecoins.value, 1)}
                </p>
                {data.stablecoins.change7d !== null && (
                  <p className="text-sm tabular-nums">
                    <span
                      className={`font-semibold ${
                        data.stablecoins.change7d >= 0
                          ? "text-[#16A34A]"
                          : "text-[#DC2626]"
                      }`}
                    >
                      <span className="text-[10px]">
                        {data.stablecoins.change7d >= 0 ? "▲" : "▼"}
                      </span>{" "}
                      {formatPercent(Math.abs(data.stablecoins.change7d), false)}
                    </span>
                    <span className="text-[#9CA3AF] ml-1">7일</span>
                  </p>
                )}
              </div>
              {/* Sparkline */}
              {data.stablecoins.sparkline.length > 0 && (
                <div className="flex-1 flex items-end mt-1">
                  <ResponsiveContainer width="100%" height={40}>
                    <AreaChart
                      data={data.stablecoins.sparkline.map((v) => ({
                        value: v,
                      }))}
                      margin={{ top: 4, right: 2, left: 2, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient
                          id="sparkGradKey"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#E7F60E"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="100%"
                            stopColor="#E7F60E"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                      </defs>
                      <YAxis domain={["dataMin", "dataMax"]} hide />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#C4D00B"
                        strokeWidth={1.5}
                        fill="url(#sparkGradKey)"
                        activeDot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </QuickStatCard>

          {/* Card 5: ETF Flows */}
          <QuickStatCard
            label="ETF 자금흐름"
            subtitle={data.etfFlows.date ?? undefined}
            className="min-w-[160px]"
          >
            <div className="flex-1 flex flex-col justify-center space-y-2">
              {/* BTC ETF */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/pixels/bitcoin.png"
                    alt="BTC"
                    width={24}
                    height={24}
                  />
                  <span className="text-xs text-[#6B7280]">BTC</span>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    data.etfFlows.btc === null
                      ? "text-[#9CA3AF]"
                      : data.etfFlows.btc >= 0
                        ? "text-[#16A34A]"
                        : "text-[#DC2626]"
                  }`}
                >
                  {data.etfFlows.btc !== null && (
                    <span className="text-[10px]">
                      {data.etfFlows.btc >= 0 ? "▲" : "▼"}
                    </span>
                  )}{" "}
                  {formatUsd(Math.abs(data.etfFlows.btc ?? 0), 0)}
                </span>
              </div>
              {/* ETH ETF */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/pixels/ethereum.png"
                    alt="ETH"
                    width={24}
                    height={24}
                  />
                  <span className="text-xs text-[#6B7280]">ETH</span>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    data.etfFlows.eth === null
                      ? "text-[#9CA3AF]"
                      : data.etfFlows.eth >= 0
                        ? "text-[#16A34A]"
                        : "text-[#DC2626]"
                  }`}
                >
                  {data.etfFlows.eth !== null && (
                    <span className="text-[10px]">
                      {data.etfFlows.eth >= 0 ? "▲" : "▼"}
                    </span>
                  )}{" "}
                  {formatUsd(Math.abs(data.etfFlows.eth ?? 0), 0)}
                </span>
              </div>
              {/* SOL ETF */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image
                    src="/assets/pixels/solana.png"
                    alt="SOL"
                    width={24}
                    height={24}
                  />
                  <span className="text-xs text-[#6B7280]">SOL</span>
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    data.etfFlows.sol === null
                      ? "text-[#9CA3AF]"
                      : data.etfFlows.sol >= 0
                        ? "text-[#16A34A]"
                        : "text-[#DC2626]"
                  }`}
                >
                  {data.etfFlows.sol !== null && (
                    <span className="text-[10px]">
                      {data.etfFlows.sol >= 0 ? "▲" : "▼"}
                    </span>
                  )}{" "}
                  {formatUsd(Math.abs(data.etfFlows.sol ?? 0), 0)}
                </span>
              </div>
            </div>
          </QuickStatCard>
        </div>

        {/* Right fade indicator to hint more content */}
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[#F6F7F9] to-transparent pointer-events-none" />
      </div>
    </section>
  );
}
