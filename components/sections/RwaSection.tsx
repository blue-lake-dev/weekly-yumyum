"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";

interface RwaDataPoint {
  date: string;
  total: number;
  [key: string]: string | number;
}

interface CategoryConfig {
  key: string;
  color: string;
}

interface RwaApiResponse {
  data: RwaDataPoint[];
  categories: CategoryConfig[];
  latest: {
    date: string;
    total: number;
    byCategory: Record<string, number>;
  };
  changes: {
    d7: number | null;
    d30: number | null;
  };
  error?: string;
}

// Short display names for categories
const SHORT_NAMES: Record<string, string> = {
  "US Treasury Debt": "US Treasury",
  "non-US Government Debt": "Non-US Gov",
  "Corporate Bonds": "Corp Bonds",
  "Private Credit": "Private Credit",
  "Public Equity": "Public Equity",
  "Private Equity": "Private Equity",
  "Commodities": "Commodities",
  "Structured Credit": "Structured",
  "Institutional Alternative Funds": "Alt Funds",
  "Actively-Managed Strategies": "Active Mgmt",
};

function formatBillions(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

function formatChange(value: number | null): { text: string; color: string } {
  if (value === null) return { text: "—", color: "text-[#6B7280]" };
  const sign = value >= 0 ? "+" : "";
  const color = value >= 0 ? "text-[#16A34A]" : "text-[#DC2626]";
  return { text: `${sign}${value.toFixed(1)}%`, color };
}

export function RwaSection() {
  const [data, setData] = useState<RwaApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/v1/rwa");
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="py-8 text-center text-sm text-[#9CA3AF]">
        {error || data?.error || "데이터 없음"}
      </div>
    );
  }

  const d30 = formatChange(data.changes.d30);

  // Format chart data - add Korean date for tooltip
  const chartData = data.data.map((d) => ({
    ...d,
    fullDate: new Date(d.date).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  }));

  // Generate Jan 1st ticks for each year in the data
  const years = new Set(chartData.map((d) => new Date(d.date).getFullYear()));
  const yearTicks = Array.from(years)
    .sort()
    .map((y) => `${y}-01-01`)
    .filter((tick) => chartData.some((d) => d.date === tick));

  // Get categories sorted by latest value for legend
  const sortedCategories = data.categories
    .map((c) => ({
      ...c,
      value: data.latest.byCategory[c.key] || 0,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      {/* Header: Total + Changes */}
      <div>
        <p className="font-semibold text-sm text-[#6B7280] mb-1">RWA 총액</p>
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-[#171717] tabular-nums">
            {formatBillions(data.latest.total)}
          </p>
          <span className={`text-sm font-medium tabular-nums ${d30.color}`}>
            {d30.text}
            <span className="text-[#9CA3AF] ml-0.5">30일</span>
          </span>
        </div>
      </div>

      {/* Stacked Area Chart */}
      <div className="h-56 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              ticks={yearTicks}
              tickFormatter={(date) => new Date(date).getFullYear().toString()}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#9CA3AF" }}
              tickFormatter={(v) => `$${(v / 1e9).toFixed(0)}B`}
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload;
                const total = payload.reduce(
                  (sum, p) => sum + ((p.value as number) || 0),
                  0
                );
                return (
                  <div className="rounded-lg bg-white border border-[#E5E7EB] px-3 py-2 text-sm shadow-lg">
                    <p className="text-[#6B7280] font-medium mb-2">{point?.fullDate}</p>
                    <p className="text-[#171717] font-bold mb-2">
                      Total: {formatBillions(total)}
                    </p>
                    <div className="space-y-1">
                      {payload
                        .filter((p) => (p.value as number) > 0)
                        .sort((a, b) => (b.value as number) - (a.value as number))
                        .slice(0, 6)
                        .map((p) => (
                          <div
                            key={p.dataKey}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: p.color }}
                              />
                              <span className="text-[#6B7280]">
                                {SHORT_NAMES[p.dataKey as string] || p.dataKey}
                              </span>
                            </div>
                            <span className="text-[#171717] font-medium tabular-nums">
                              {formatBillions(p.value as number)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              }}
            />
            {data.categories.map((cat) => (
              <Area
                key={cat.key}
                type="monotone"
                dataKey={cat.key}
                stackId="1"
                stroke={cat.color}
                fill={cat.color}
                fillOpacity={0.8}
                strokeWidth={0}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - All categories */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {sortedCategories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-1 text-xs">
            <span
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-[#6B7280]">{SHORT_NAMES[cat.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
