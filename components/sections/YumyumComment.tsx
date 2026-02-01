"use client";

import Image from "next/image";
import { useSummarySuspense } from "@/lib/hooks/use-summary";

export function YumyumComment() {
  const { data } = useSummarySuspense();

  const summary = data?.summary ?? null;
  const date = data?.date;

  return (
    <section className="mb-6 rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#171717]">얌얌의 한마디</h2>
        {date && <span className="text-xs text-[#9CA3AF]">{date}</span>}
      </div>

      <div className="flex gap-3">
        {/* Mascot */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#E7F60E] flex items-center justify-center">
            <Image
              src="/assets/pixels/doge.png"
              alt="얌얌"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        </div>

        {/* Speech bubble */}
        <div className="flex-1 relative">
          <div className="bg-[#F6F7F9] rounded-lg rounded-tl-none p-3">
            <p className="text-sm text-[#171717] leading-relaxed">
              {summary || "오늘의 코멘트를 준비 중입니다..."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
