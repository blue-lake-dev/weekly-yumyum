"use client";

import { useState } from "react";
import { Derivatives } from "./Derivatives";
import { RwaSection } from "./RwaSection";
import { useDerivativesSuspense } from "@/lib/hooks/use-derivatives";
import { useRwa } from "@/lib/hooks/use-rwa";

type Tab = "derivatives" | "rwa";

export function MoreTabs() {
  const { data: derivativesData } = useDerivativesSuspense();
  const { data: rwaData } = useRwa();
  const [activeTab, setActiveTab] = useState<Tab>("derivatives");

  const tabs: { id: Tab; label: string }[] = [
    { id: "derivatives", label: "파생상품" },
    { id: "rwa", label: "RWA" },
  ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#171717]">더보기</h2>
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeTab === tab.id
                  ? "bg-[#171717] text-white"
                  : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
        {activeTab === "derivatives" ? (
          <Derivatives data={derivativesData ?? null} />
        ) : (
          <RwaSection data={rwaData ?? null} />
        )}
      </div>
    </section>
  );
}
