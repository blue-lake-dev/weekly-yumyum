"use client";

import { RwaSection } from "./RwaSection";
import { RwaByChain } from "./RwaByChain";

// NOTE: Derivatives tab deferred - free APIs only provide account-based ratios,
// not position-weighted ratios. Will add back when Coinglass API or similar available.

export function MoreTabs() {
  return (
    <section className="mb-3">
      {/* Section Label */}
      <h2 className="mb-1 font-bold text-lg text-[#171717]">더보기</h2>

      {/* Single tab for now - RWA only */}
      <div className="flex items-center gap-6 border-b border-[#E5E7EB]">
        <button
          className="relative py-2 text-base font-semibold text-[#171717] transition-colors"
        >
          RWA
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E7F60E]" />
        </button>
      </div>

      {/* Content - Two cards side by side */}
      <div className="mt-2 flex items-stretch gap-3">
        {/* RWA Chart Card */}
        <div className="flex-1 rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
          <RwaSection />
        </div>

        {/* RWA by Chain Card */}
        <div className="w-[280px] flex-shrink-0 rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
          <RwaByChain />
        </div>
      </div>
    </section>
  );
}
