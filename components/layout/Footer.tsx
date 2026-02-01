interface FooterProps {
  lastUpdated?: string;
}

export function Footer({ lastUpdated }: FooterProps) {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white py-6">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between text-xs text-[#6B7280]">
          <p>© 2026 얌얌코인</p>
          {lastUpdated && <p>Last updated: {lastUpdated}</p>}
        </div>
        <p className="mt-2 text-xs text-[#9CA3AF]">
          Data: CoinGecko, DeFiLlama, Dune Analytics, Farside Investors
        </p>
      </div>
    </footer>
  );
}
