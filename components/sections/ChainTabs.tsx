"use client";

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
import type { Chain } from "@/lib/api/fetchers";

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

interface EthData {
  chain: "eth";
  price7d: { change: number | null; sparkline: number[] };
  supply: { circulating: number | null; totalBurnt: number | null; stakingRewards: number | null };
  burn: { last24h: number | null; last7d: number | null; supplyGrowthPct: number | null; isDeflationary: boolean | null };
  tvl: { total: number | null; change7d: number | null; sparkline: number[] };
  stablecoins: { total: number | null; change7d: number | null };
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
  btc: "비트코인",
  eth: "이더리움",
  sol: "솔라나",
};

const chainIcons: Record<Chain, string> = {
  btc: "₿",
  eth: "Ξ",
  sol: "◎",
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
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {chains.map((chain) => (
          <button
            key={chain}
            onClick={() => onChainChange(chain)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeChain === chain
                ? "bg-[#E7F60E] text-[#171717]"
                : "bg-white text-[#6B7280] hover:bg-gray-50 border border-[#E5E7EB]"
            }`}
          >
            {chainIcons[chain]} {chainLabels[chain]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
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
              <Area type="monotone" dataKey="value" stroke="#627EEA" fill="#627EEA" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="총 공급량" value={formatMillions(data.supply.circulating)} subValue="ETH" />
        <StatCard label="TVL" value={formatBillions(data.tvl.total)} change={data.tvl.change7d} />
        <StatCard label="스테이블코인" value={formatBillions(data.stablecoins.total)} change={data.stablecoins.change7d} />
        <StatCard
          label="인플레이션"
          value={data.burn.supplyGrowthPct ? `${data.burn.supplyGrowthPct.toFixed(2)}%` : "—"}
          highlight={data.burn.isDeflationary ? "deflationary" : undefined}
        />
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
