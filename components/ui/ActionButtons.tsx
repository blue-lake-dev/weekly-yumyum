"use client";

interface ActionButtonsProps {
  onRefresh?: () => void;
  onExportExcel?: () => void;
  onCopyTelegram?: () => void;
  isLoading?: boolean;
}

export function ActionButtons({
  onRefresh,
  onExportExcel,
  onCopyTelegram,
  isLoading = false,
}: ActionButtonsProps) {
  const baseClass = "px-3 py-1.5 text-sm font-medium rounded-md transition-colors";
  const enabledClass = "text-neutral hover:text-foreground hover:bg-neutral/10";
  const disabledClass = "text-neutral/40 cursor-not-allowed";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={`${baseClass} ${isLoading ? disabledClass : enabledClass}`}
        title="새로고침"
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-1">
            <span className="animate-spin">⏳</span> 로딩중...
          </span>
        ) : (
          "🔄 새로고침"
        )}
      </button>
      <button
        onClick={onExportExcel}
        disabled={isLoading}
        className={`${baseClass} ${isLoading ? disabledClass : enabledClass}`}
        title="Excel 다운로드"
      >
        📥 Excel
      </button>
      <button
        onClick={onCopyTelegram}
        disabled={isLoading}
        className={`${baseClass} ${isLoading ? disabledClass : enabledClass}`}
        title="텔레그램 복사"
      >
        ✈️ 텔레그램
      </button>
    </div>
  );
}
