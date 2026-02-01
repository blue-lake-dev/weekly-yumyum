"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "시장지표" },
  { href: "/calendar", label: "일정", badge: null as number | null },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo + Pixel Mascots */}
        <div className="flex flex-1 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/assets/logo-full.png"
              alt="얌얌코인"
              width={120}
              height={36}
              className="object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-1">
            <Image
              src="/assets/pixels/doge.png"
              alt="Doge"
              width={48}
              height={48}
            />
            <Image
              src="/assets/pixels/pepe.png"
              alt="Pepe"
              width={48}
              height={48}
            />
            <Image
              src="/assets/pixels/robot.png"
              alt="Robot"
              width={48}
              height={48}
            />
          </div>
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-6 h-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center h-full px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-[#171717] font-semibold"
                    : "text-[#6B7280] hover:text-[#171717]"
                }`}
              >
                {item.label}
                {"badge" in item && item.badge !== null && (
                  <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DC2626] px-1.5 text-xs font-bold text-white">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#E7F60E]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Social Links + Admin */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <a
            href="https://www.youtube.com/@yumyum-coin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center"
            aria-label="YouTube"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#FF0000]">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </a>
          <a
            href="https://t.me/yumyumcoin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center"
            aria-label="Telegram"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#0088CC]">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
          </a>
          <button className="rounded-lg bg-[#E7F60E] px-4 py-2 text-sm font-semibold text-[#171717]">
            Admin
          </button>
        </div>
      </div>
    </header>
  );
}
