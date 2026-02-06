import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://app.yumyumcoin.xyz";

export const metadata: Metadata = {
  title: "얌얌코인 | 크립토 데일리 대시보드",
  description: "돈 되는 코인 정보만 편식하자. BTC·ETH·SOL 시장지표, ETF 자금흐름, 온체인 데이터를 한눈에.",
  openGraph: {
    title: "얌얌코인 | 크립토 데일리 대시보드",
    description: "돈 되는 코인 정보만 편식하자. BTC·ETH·SOL 시장지표, ETF 자금흐름, 온체인 데이터를 한눈에.",
    type: "website",
    url: BASE_URL,
    locale: "ko_KR",
    images: [
      {
        url: `${BASE_URL}/assets/pixels/bull-vs-bear.webp`,
        width: 1200,
        height: 630,
        alt: "얌얌코인 - 크립토 데일리 대시보드",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "얌얌코인 | 크립토 데일리 대시보드",
    description: "돈 되는 코인 정보만 편식하자. BTC·ETH·SOL 시장지표, ETF 자금흐름, 온체인 데이터를 한눈에.",
    images: [`${BASE_URL}/assets/pixels/bull-vs-bear.webp`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
