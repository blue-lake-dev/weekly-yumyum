"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSummarySuspense } from "@/lib/hooks/use-summary";

// Typewriter effect hook
function useTypewriter(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsComplete(true);
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayedText, isComplete };
}

export function YumyumComment() {
  const { data } = useSummarySuspense();

  const summary = data?.summary ?? null;

  const { displayedText, isComplete } = useTypewriter(
    summary || "오늘의 코멘트를 준비 중입니다...",
    25
  );

  return (
    <section className="mb-6">
      {/* Section Header - Outside card */}
      <h2 className="mb-3 font-pixel text-lg text-[#171717]">얌얌 브리핑</h2>

      {/* Card */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-4 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Mascot - flipped to face right */}
          <div className="flex-shrink-0">
            <Image
              src="/assets/pixels/doge-suit-grey-glasses.png"
              alt="얌얌"
              width={80}
              height={80}
              className="object-contain"
              style={{ transform: "scaleX(-1)" }}
            />
          </div>

          {/* Speech bubble with left pointer */}
          <div className="flex-1 relative">
            {/* Pointer triangle */}
            <div
              className="absolute left-0 top-4 w-0 h-0"
              style={{
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderRight: "10px solid #F6F7F9",
                marginLeft: "-10px",
              }}
            />
            {/* Bubble */}
            <div className="bg-[#F6F7F9] rounded-lg p-4">
              <p className="text-sm text-[#171717] leading-relaxed">
                {displayedText}
                {!isComplete && (
                  <span className="inline-block w-0.5 h-4 bg-[#171717] ml-0.5 animate-pulse" />
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
