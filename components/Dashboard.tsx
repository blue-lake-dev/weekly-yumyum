"use client";

import { Suspense, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";

// Blocking sections (data is awaited on server)
import { Ticker } from "@/components/sections/Ticker";
import { QuickStats } from "@/components/sections/QuickStats";

// Streaming sections (wrapped in Suspense)
import { TodaysCoin } from "@/components/sections/TodaysCoin";
import { YumyumComment } from "@/components/sections/YumyumComment";
import { ChainTabs } from "@/components/sections/ChainTabs";
import { MoreTabs } from "@/components/sections/MoreTabs";

import type { Chain } from "@/lib/api/fetchers";

export function Dashboard() {
  const [activeChain, setActiveChain] = useState<Chain>("eth");

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <Header />

      {/* ❶ Ticker - Full width, attached to header */}
      <Ticker />

      <main className="mx-auto max-w-5xl px-4 pt-3 pb-6">
        {/* ❷ Quick Stats - Blocking (instant) */}
        <QuickStats />

        {/* ❸ 오늘의 코인 - Streaming */}
        <ErrorBoundary>
          <Suspense fallback={<TodaysCoinSkeleton />}>
            <TodaysCoin />
          </Suspense>
        </ErrorBoundary>

        {/* ❹ 얌얌의 한마디 - Streaming */}
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton height="h-28" />}>
            <YumyumComment />
          </Suspense>
        </ErrorBoundary>

        {/* ❺ Chain Tabs - Suspense handled internally */}
        <ErrorBoundary>
          <ChainTabs
            activeChain={activeChain}
            onChainChange={setActiveChain}
          />
        </ErrorBoundary>

        {/* ❻ 더보기 - Streaming */}
        <ErrorBoundary>
          <Suspense fallback={<SectionSkeleton height="h-48" />}>
            <MoreTabs />
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}

function SectionSkeleton({ height }: { height: string }) {
  return (
    <div className={`mb-6 rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm ${height}`}>
      <Skeleton className="h-5 w-32 mb-3" />
      <Skeleton className="h-full w-full" />
    </div>
  );
}

function TodaysCoinSkeleton() {
  return (
    <section className="mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-16" />
      </div>
      {/* Two Cards */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] shadow-sm p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-4 w-12" />
                <div className="flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
