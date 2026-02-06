"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/Skeleton";
import { useInViewMount } from "@/lib/hooks/use-in-view-mount";

// Blocking sections (data is awaited on server)
import { Ticker } from "@/components/sections/Ticker";
import { QuickStats } from "@/components/sections/QuickStats";

// Streaming sections (wrapped in Suspense)
import { TodaysCoin } from "@/components/sections/TodaysCoin";
import { YumyumComment } from "@/components/sections/YumyumComment";
import { ChainTabs } from "@/components/sections/ChainTabs";
import { MoreTabs } from "@/components/sections/MoreTabs";


export function Dashboard() {
  // Mount sections when they enter the viewport
  const [todaysCoinRef, showTodaysCoin] = useInViewMount();
  const [commentRef, showComment] = useInViewMount();
  const [chainTabsRef, showChainTabs] = useInViewMount();
  const [moreTabsRef, showMoreTabs] = useInViewMount();

  return (
    <div className="min-h-screen bg-[#F6F7F9]">
      <Header />

      {/* ❶ Ticker - Full width, attached to header */}
<Ticker />

      <main className="mx-auto max-w-5xl px-4 pt-3 pb-6">
        {/* ❷ Quick Stats - Blocking (instant) */}
        <QuickStats />

        {/* ❸ 오늘의 코인 - Streaming */}
        <div ref={todaysCoinRef}>
          {showTodaysCoin ? (
            <ErrorBoundary>
              <Suspense fallback={<TodaysCoinSkeleton />}>
                <TodaysCoin />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <TodaysCoinSkeleton />
          )}
        </div>

        {/* ❹ 얌얌의 한마디 - Streaming */}
        <div ref={commentRef}>
          {showComment ? (
            <ErrorBoundary>
              <Suspense fallback={<YumyumCommentSkeleton />}>
                <YumyumComment />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <YumyumCommentSkeleton />
          )}
        </div>

        {/* ❺ Chain Tabs - Suspense handled internally */}
        <div ref={chainTabsRef}>
          {showChainTabs ? (
            <ErrorBoundary>
              <ChainTabs />
            </ErrorBoundary>
          ) : (
            <SectionSkeleton height="h-64" />
          )}
        </div>

        {/* ❻ 더보기 - Streaming */}
        <div ref={moreTabsRef}>
          {showMoreTabs ? (
            <ErrorBoundary>
              <Suspense fallback={<SectionSkeleton height="h-48" />}>
                <MoreTabs />
              </Suspense>
            </ErrorBoundary>
          ) : (
            <SectionSkeleton height="h-48" />
          )}
        </div>
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

function YumyumCommentSkeleton() {
  return (
    <section className="mb-3">
      {/* Section Header - Outside card */}
      <Skeleton className="h-6 w-28 mb-3" />

      {/* Card */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Mascot placeholder */}
          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />

          {/* Speech bubble placeholder */}
          <div className="flex-1">
            <div className="bg-[#F6F7F9] rounded-lg p-4">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </section>
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
