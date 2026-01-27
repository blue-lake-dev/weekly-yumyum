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
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Mock data for ETH Price (7 days)
const ethPriceData = [
  { date: "1/19", price: 3280 },
  { date: "1/20", price: 3150 },
  { date: "1/21", price: 3320 },
  { date: "1/22", price: 3180 },
  { date: "1/23", price: 3400 },
  { date: "1/24", price: 3380 },
  { date: "1/25", price: 3456 },
];

// Mock data for Supply sparkline (volatile trending up)
const supplyData = [
  { day: 1, value: 100 },
  { day: 2, value: 115 },
  { day: 3, value: 105 },
  { day: 4, value: 125 },
  { day: 5, value: 118 },
  { day: 6, value: 140 },
  { day: 7, value: 155 },
];

// Mock data for TVL sparkline (volatile trending up)
const tvlData = [
  { day: 1, value: 30 },
  { day: 2, value: 45 },
  { day: 3, value: 35 },
  { day: 4, value: 50 },
  { day: 5, value: 42 },
  { day: 6, value: 55 },
  { day: 7, value: 65 },
];

// Mock data for BTC ETF Flow (7 days) - split positive/negative
const btcEtfFlowData = [
  { date: "1/19", positive: 0, negative: -420 },
  { date: "1/20", positive: 380, negative: 0 },
  { date: "1/21", positive: 520, negative: 0 },
  { date: "1/22", positive: 0, negative: -280 },
  { date: "1/23", positive: 780, negative: 0 },
  { date: "1/24", positive: 0, negative: -620 },
  { date: "1/25", positive: 0, negative: -350 },
];

// Mock data for ETH ETF Flow (7 days) - split positive/negative
const ethEtfFlowData = [
  { day: 1, positive: 320, negative: 0 },
  { day: 2, positive: 1100, negative: 0 },
  { day: 3, positive: 1243, negative: 0 },
  { day: 4, positive: 0, negative: -180 },
  { day: 5, positive: 0, negative: -2785 },
  { day: 6, positive: 520, negative: 0 },
  { day: 7, positive: 0, negative: -460 },
];

// Mock data for Burn vs Issuance (7 days)
const burnIssuanceData = [
  { date: "1/19", burn: 2847, issuance: 2312 },
  { date: "1/20", burn: 3102, issuance: 2298 },
  { date: "1/21", burn: 2654, issuance: 2305 },
  { date: "1/22", burn: 2987, issuance: 2310 },
  { date: "1/23", burn: 3245, issuance: 2315 },
  { date: "1/24", burn: 2876, issuance: 2308 },
  { date: "1/25", burn: 2934, issuance: 2312 },
];

export default function DashboardV2Preview() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Left: Logo + Pixel Mascots */}
          <div className="flex flex-1 items-center gap-3">
            <span className="font-pixel text-xl text-[#171717]">
              YUMYUM
            </span>
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
        {/* ETH Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">
            이더리움
          </h2>

          {/* Row 1: ETH Price Card - Full Width */}
          <div className="mb-3 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-pixel text-sm text-[#6B7280]">
                  이더리움 현재가
                </p>
                <p className="text-4xl font-bold text-[#171717] tabular-nums tracking-tight">
                  $3,456{" "}
                  <span className="text-lg text-[#16A34A]">+5.7%</span>
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
                <AreaChart data={ethPriceData}>
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
                    fillOpacity={1}
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
                  <p className="font-pixel text-sm text-[#6B7280]">
                    공급량
                  </p>
                  <p className="text-2xl font-extrabold text-[#171717] tabular-nums tracking-tight">
                    1.2억 ETH
                  </p>
                  <p className="text-xs font-semibold text-[#16A34A]">+1,247 (7d)</p>
                </div>
                <div className="h-16 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={supplyData}>
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
                    $48B
                  </p>
                  <p className="text-xs font-semibold text-[#16A34A]">+2.1% (7d)</p>
                </div>
                <div className="h-16 w-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={tvlData}>
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
          <div className="rounded-xl bg-white p-4 shadow-sm">
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
            <p className="text-xl font-extrabold text-[#16A34A] tabular-nums tracking-tight mb-2">
              -4,285 ETH
            </p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={burnIssuanceData} barGap={2}>
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
                  <Bar dataKey="issuance" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
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
                    $12.4B
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
              <p className="font-pixel text-sm text-[#6B7280] mb-3">체인별 RWA</p>
              {/* Horizontal bars */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-16 font-semibold text-[#171717]">Ethereum</span>
                  <div className="h-3 bg-[#E7F60E] rounded-full" style={{ width: "55%" }} />
                  <span className="font-semibold text-[#171717]">$12.3B</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-semibold text-[#171717]">Tron</span>
                  <div className="h-3 bg-[#E7F60E] rounded-full" style={{ width: "25%" }} />
                  <span className="font-semibold text-[#171717]">$1.48B</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-semibold text-[#171717]">Solana</span>
                  <div className="h-3 bg-[#E7F60E] rounded-full" style={{ width: "10%" }} />
                  <span className="font-semibold text-[#171717]">$0.36B</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-semibold text-[#171717]">Other</span>
                  <div className="h-3 bg-[#E7F60E] rounded-full" style={{ width: "5%" }} />
                  <span className="font-semibold text-[#171717]">$0.14B</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Category RWA - Full Width */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-pixel text-sm text-[#6B7280] mb-3">카테고리별 RWA</p>
            {/* Horizontal bars with background */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Real Estate</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "100%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$12.4B <span className="text-[#6B7280] font-normal">(100%)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Commodities</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "65%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$30.2B <span className="text-[#6B7280] font-normal">(132%)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Bonds</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "45%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$33.6B <span className="text-[#6B7280] font-normal">(12%)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Companies</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "20%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$12.6B <span className="text-[#6B7280] font-normal">(5%)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Enterprises</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "10%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$6.3B <span className="text-[#6B7280] font-normal">(6%)</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24 font-semibold text-[#171717]">Other</span>
                <div className="flex-1 h-3 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#E7F60E] rounded-full" style={{ width: "5%" }} />
                </div>
                <span className="w-24 font-semibold text-[#171717]">$3.5B <span className="text-[#6B7280] font-normal">(0%)</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* ETF Section */}
        <section className="mb-4">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">ETF</h2>

          {/* Row 1: ETH ETF Flow + ETH Holdings - 50/50 */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            {/* ETH ETF Flow Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-pixel text-sm text-[#6B7280]">ETH ETF 자금흐름</p>
                  <p className="text-xl font-extrabold text-[#DC2626] tabular-nums tracking-tight">
                    -$242M
                  </p>
                </div>
                <Image
                  src="/assets/pixels/doge-suit.png"
                  alt="Doge Suit"
                  width={48}
                  height={48}
                />
              </div>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ethEtfFlowData} stackOffset="sign">
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Bar dataKey="positive" fill="#E7F60E" stackId="stack" />
                    <Bar dataKey="negative" fill="#DC2626" stackId="stack" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ETH Holdings Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="font-pixel text-sm text-[#6B7280] mb-3">ETH 보유량</p>
              {/* Horizontal bars */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-12 font-semibold text-[#171717]">ETHA</span>
                  <div className="flex-1">
                    <div className="h-3 bg-[#E7F60E] rounded-full" style={{ width: "100%" }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-[#171717]">60%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 font-semibold text-[#171717]">ETHW</span>
                  <div className="flex-1">
                    <div className="h-3 bg-[#0D9488] rounded-full" style={{ width: "42%" }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-[#171717]">25%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-12 font-semibold text-[#171717]">Others</span>
                  <div className="flex-1">
                    <div className="h-3 bg-[#9CA3AF] rounded-full" style={{ width: "25%" }} />
                  </div>
                  <span className="w-10 text-right font-semibold text-[#171717]">15%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: BTC ETF Flow - Full Width */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <p className="font-pixel text-sm text-[#6B7280]">BTC ETF 자금흐름</p>
              <p className="text-xl font-extrabold text-[#16A34A] tabular-nums tracking-tight">
                +$10M
              </p>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={btcEtfFlowData} stackOffset="sign">
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#6B7280" }}
                  />
                  <YAxis hide />
                  <Bar dataKey="positive" fill="#E7F60E" stackId="stack" />
                  <Bar dataKey="negative" fill="#DC2626" stackId="stack" />
                </BarChart>
              </ResponsiveContainer>
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
              <p className="font-pixel text-xs text-[#6B7280]">비트코인 현재가</p>
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
                  $94,567
                </p>
                <p className="text-xs font-semibold text-[#16A34A]">+2.3%</p>
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
                  54.2%
                </p>
                <p className="text-xs font-semibold text-[#DC2626]">-0.8%</p>
              </div>
            </div>

            {/* Fear & Greed */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">공포 탐욕 지수</p>
              <div className="flex justify-center">
                <div className="relative w-16 h-10">
                  {/* Half circle gauge */}
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    {/* Background arc */}
                    <path
                      d="M 5 50 A 45 45 0 0 1 95 50"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#DC2626" />
                        <stop offset="35%" stopColor="#F59E0B" />
                        <stop offset="65%" stopColor="#EAB308" />
                        <stop offset="100%" stopColor="#16A34A" />
                      </linearGradient>
                    </defs>
                    {/* Needle */}
                    <line
                      x1="50"
                      y1="50"
                      x2="50"
                      y2="12"
                      stroke="#374151"
                      strokeWidth="2"
                      strokeLinecap="round"
                      transform="rotate(50, 50, 50)"
                    />
                    <circle cx="50" cy="50" r="4" fill="#374151" />
                    {/* Labels */}
                    <text x="8" y="48" fontSize="8" fill="#6B7280">0</text>
                    <text x="85" y="48" fontSize="8" fill="#6B7280">100</text>
                  </svg>
                </div>
              </div>
              <p className="text-lg font-extrabold text-[#16A34A] tabular-nums tracking-tight">
                72 탐욕
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
                  0.0365
                </p>
                <p className="text-xs font-semibold text-[#16A34A]">+1.2%</p>
              </div>
            </div>

            {/* Stablecoin Market Cap */}
            <div className="rounded-xl bg-white p-3 shadow-sm text-center h-40 flex flex-col justify-between">
              <p className="font-pixel text-xs text-[#6B7280]">스테이블코인 시가총액</p>
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
                  $178.4B
                </p>
                <p className="text-xs font-semibold text-[#16A34A]">+0.5%</p>
              </div>
            </div>
          </div>

          {/* Row 2: Stablecoin by Chain - Full Width */}
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="font-pixel text-sm text-[#6B7280] mb-3">체인별 스테이블코인</p>
            {/* Segmented bar */}
            <div className="flex h-4 w-full rounded-full overflow-hidden mb-3">
              <div className="bg-[#E7F60E]" style={{ width: "45%" }} />
              <div className="bg-[#0D9488]" style={{ width: "25%" }} />
              <div className="bg-[#6366F1]" style={{ width: "15%" }} />
              <div className="bg-[#9CA3AF]" style={{ width: "10%" }} />
              <div className="bg-[#D1D5DB]" style={{ width: "5%" }} />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#E7F60E]" />
                <span className="font-semibold">Ethereum</span>
                <span className="text-[#6B7280]">$80.3B (45%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#0D9488]" />
                <span className="font-semibold">Tron</span>
                <span className="text-[#6B7280]">$44.6B (25%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#6366F1]" />
                <span className="font-semibold">Solana</span>
                <span className="text-[#6B7280]">$26.8B (15%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#9CA3AF]" />
                <span className="font-semibold">Arbitrum</span>
                <span className="text-[#6B7280]">$17.8B (10%)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-[#D1D5DB]" />
                <span className="font-semibold">Other</span>
                <span className="text-[#6B7280]">$8.9B (5%)</span>
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white py-6">
        <div className="mx-auto max-w-3xl px-4">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <p>© 2026 얌얌코인</p>
            <p>Last updated: 2026-01-27 09:30 KST</p>
          </div>
          <p className="mt-2 text-xs text-[#9CA3AF]">
            Data: CoinGecko, DeFiLlama, Glassnode, Dune Analytics
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
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 fill-[#171717]"
          >
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
