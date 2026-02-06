"use client";

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function CalendarPage() {
  return (
    <>
      <Header />
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 bg-[#F6F7F9]">
        <Image
          src="/assets/pixels/crypto_calendar_coming_soon.webp"
          alt="Crypto Calendar Coming Soon"
          width={480}
          height={480}
          className="rounded-2xl"
          priority
        />
        <p className="mt-4 text-sm text-[#6B7280]">
          <Link href="/" className="hover:text-[#171717] transition-colors">
            ← 시장지표로 돌아가기
          </Link>
        </p>
      </div>
    </>
  );
}
