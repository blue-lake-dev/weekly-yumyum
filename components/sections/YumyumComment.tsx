"use client";

import { useRef, useEffect } from "react";
import Image from "next/image";
import { useSummarySuspense } from "@/lib/hooks/use-summary";

export function YumyumComment() {
  const { data } = useSummarySuspense();
  const summary = data?.summary ?? "오늘의 코멘트를 준비 중입니다...";

  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = textRef.current;
    const cursor = cursorRef.current;
    if (!el) return;

    el.textContent = "";
    if (cursor) cursor.style.display = "inline-block";

    let i = 0;
    let cancelled = false;
    let lastTime = 0;

    const tick = (now: number) => {
      if (cancelled) return;
      if (now - lastTime >= 25) {
        el.textContent += summary.charAt(i);
        lastTime = now;
        i++;
      }
      if (i < summary.length) {
        requestAnimationFrame(tick);
      } else {
        if (cursor) cursor.style.display = "none";
      }
    };
    requestAnimationFrame(tick);

    return () => { cancelled = true; };
  }, [summary]);

  return (
    <section className="mb-3">
      {/* Section Header - Outside card */}
      <h2 className="mb-3 font-bold text-lg text-[#171717]">얌얌 브리핑</h2>

      {/* Card */}
      <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 shadow-sm">
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
                <span ref={textRef} />
                <span
                  ref={cursorRef}
                  className="inline-block w-0.5 h-4 bg-[#171717] ml-0.5 animate-pulse align-middle"
                />
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
