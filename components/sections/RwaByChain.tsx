"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

interface ChainData {
  name: string;
  value: number;
  color: string;
  percent: number;
  share: number;
}

interface RwaByChainResponse {
  total: number;
  chains: ChainData[];
  error?: string;
}

function formatCompact(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  return `$${value.toFixed(0)}`;
}

export function RwaByChain() {
  const [data, setData] = useState<RwaByChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/v1/rwa-by-chain");
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
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
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

  return (
    <div className="w-full h-full flex flex-col">
      <p className="text-sm text-[#6B7280] mb-3">체인별 RWA</p>
      <div className="flex-1 flex flex-col justify-center space-y-2.5">
        {data.chains.map((chain) => (
          <div key={chain.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: chain.color }}
                />
                <span className="text-[#374151] font-medium">{chain.name}</span>
              </div>
              <span className="text-[#171717] font-semibold tabular-nums">
                {formatCompact(chain.value)}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 bg-[#F3F4F6] rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${chain.percent}%`,
                  backgroundColor: chain.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
