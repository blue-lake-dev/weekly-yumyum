"use client";

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
  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          {/* Left: Logo + Pixel Mascots */}
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2">
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* ETH Section */}
        <section className="mb-12">
          <h2 className="mb-4 font-pixel text-lg text-[#171717]">
            이더리움
          </h2>

          {/* Row 1: ETH Price Card - Full Width */}
          <div className="mb-4 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-pixel text-sm text-[#6B7280]">
                  이더리움 현재가
                </p>
                <p className="text-4xl font-bold text-[#171717] tabular-nums">
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
                    stroke="#E7F60E"
                    strokeWidth={2}
                    fill="#E7F60E"
                    fillOpacity={1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Supply + TVL - 50/50 */}
          <div className="mb-4 grid grid-cols-2 gap-4">
            {/* Supply Card */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-pixel text-sm text-[#6B7280]">
                    공급량
                  </p>
                  <p className="text-2xl font-bold text-[#171717] tabular-nums">
                    1.2억 ETH
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    유통 공급량 1.19억 ETH
                  </p>
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
                  <p className="text-2xl font-bold text-[#171717] tabular-nums">
                    48조 KRW
                  </p>
                  <p className="text-xs text-[#6B7280]">예치 비율 18.5%</p>
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
            <div className="flex items-center justify-between mb-4">
              <p className="font-pixel text-sm text-[#171717]">
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
            <div className="h-40">
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
      </main>
    </div>
  );
}
