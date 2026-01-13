import Image from "next/image";

interface HeaderProps {
  updatedAt: string;
}

function formatUpdateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function Header({ updatedAt }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <Image
          src="/yumyumcoin_single_banner.webp"
          alt="YumYum Logo"
          width={48}
          height={48}
          className="h-10 w-10 rounded-full object-cover"
          priority
        />
        <h1 className="text-xl font-bold text-foreground">
          YUMYUM Weekly
        </h1>
      </div>
      <div className="text-sm text-neutral">
        업데이트: {formatUpdateTime(updatedAt)}
      </div>
    </header>
  );
}
