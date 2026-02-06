"use client";

import { useRef, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

function FadeIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("opacity-100", "translate-y-0");
          el.classList.remove("opacity-0", "translate-y-6");
          observer.disconnect();
        }
      },
      { rootMargin: "-40px", threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`opacity-0 translate-y-6 transition-all duration-700 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="bg-[#F6F7F9]">
        {/* ❶ Banner - rush_more with dark gradient overlay */}
        <section className="relative mx-auto max-w-5xl h-[280px] sm:h-[360px] overflow-hidden">
          <Image
            src="/assets/pixels/rush_more.webp"
            alt="얌얌코인 배너"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">
              🍭 돈 되는 코인 정보만 편식하자.
            </h1>
            <p className="text-sm sm:text-base text-white/80">
              한국 크립토 투자자를 위한 데일리 마켓 대시보드
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-12 space-y-16">
          {/* ❷ Doge profile + CEO greeting parody */}
          <FadeIn>
            <section className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                  <Image
                    src="/assets/pixels/doge-suit-grey-glasses.png"
                    alt="얌얌"
                    width={112}
                    height={112}
                    className="object-contain"
                    style={{ transform: "scaleX(-1)" }}
                  />
                </div>
              </div>
              <div className="space-y-3 text-[#374151] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                <p>
                  선조들이 역사에서 지혜를 얻었듯, 우리는 온체인 데이터와 트레이딩 지표에서 시장의 흐름을 읽습니다.
                </p>
                <p>
                  그 깨달음을 쉽게 풀어서 전달하는 게 얌얌코인이 하려는 일입니다.
                </p>
                <p>
                  크립토는 1~2년짜리 유행이 아니라 <span className="font-semibold text-[#171717]">미래</span>라고 믿는 팀이 만들고 있습니다.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* Accent divider */}
          <div className="flex justify-center">
            <div className="h-1 w-12 rounded-full bg-[#E7F60E]" />
          </div>

          {/* ❸ Traffic light */}
          <FadeIn>
            <section className="text-center space-y-6">
              <div className="flex justify-center">
                <Image
                  src="/assets/pixels/traffic-light.webp"
                  alt="신호등"
                  width={280}
                  height={280}
                  className="rounded-2xl max-w-full h-auto"
                />
              </div>
              <div className="space-y-2 text-[#374151] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                <p className="text-lg font-bold text-[#171717]">
                  어지러운 크립토 세계에서, 신호등이 되어 드리겠습니다.
                </p>
                <p>
                  수많은 정보 속에서 지금 뭘 봐야 하는지, 어디를 주목해야 하는지 — 방향을 잡는 데 도움이 되는 대시보드를 만들겠습니다.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* Accent divider */}
          <div className="flex justify-center">
            <div className="h-1 w-12 rounded-full bg-[#E7F60E]" />
          </div>

          {/* ❹ Bull vs Bear */}
          <FadeIn>
            <section className="text-center space-y-6">
              <div className="flex justify-center">
                <Image
                  src="/assets/pixels/bull-vs-bear.webp"
                  alt="불 vs 베어"
                  width={360}
                  height={280}
                  className="rounded-2xl max-w-full h-auto"
                />
              </div>
              <div className="space-y-2 text-[#374151] text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
                <p className="text-lg font-bold text-[#171717]">
                  불장이든 하락장이든, 우리는 계속 간다.
                </p>
                <p>
                  시장이 좋을 때만 반짝하는 채널이 아니라, 어떤 장에서든 꾸준히 함께하는 커뮤니티를 만들어가겠습니다.
                </p>
              </div>
            </section>
          </FadeIn>

          {/* Accent divider */}
          <div className="flex justify-center">
            <div className="h-1 w-12 rounded-full bg-[#E7F60E]" />
          </div>

          {/* ❺ Channel links */}
          <FadeIn>
            <section className="text-center space-y-6 pb-4">
              <h2 className="text-lg font-bold text-[#171717]">
                채널에서 같이 편식해요 🍭
              </h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://www.youtube.com/@yumyum-coin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white border border-[#E5E7EB] px-6 py-4 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-[#FF0000]">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                  <span className="text-sm font-semibold text-[#171717]">유튜브</span>
                </a>
                <a
                  href="https://t.me/yumyumcoin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl bg-white border border-[#E5E7EB] px-6 py-4 shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto"
                >
                  <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-[#0088CC]">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                  </svg>
                  <span className="text-sm font-semibold text-[#171717]">텔레그램</span>
                </a>
              </div>
            </section>
          </FadeIn>
        </div>
      </main>

      <Footer />
    </>
  );
}
