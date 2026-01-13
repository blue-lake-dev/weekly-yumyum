"use client";

interface ActionButtonsProps {
  onRefresh?: () => void;
  onExportExcel?: () => void;
  onCopyTelegram?: () => void;
}

export function ActionButtons({
  onRefresh,
  onExportExcel,
  onCopyTelegram,
}: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        className="px-3 py-1.5 text-sm font-medium text-neutral hover:text-foreground hover:bg-neutral/10 rounded-md transition-colors"
        title="새로고침"
      >
        🔄 새로고침
      </button>
      <button
        onClick={onExportExcel}
        className="px-3 py-1.5 text-sm font-medium text-neutral hover:text-foreground hover:bg-neutral/10 rounded-md transition-colors"
        title="Excel 다운로드"
      >
        📥 Excel
      </button>
      <button
        onClick={onCopyTelegram}
        className="px-3 py-1.5 text-sm font-medium text-neutral hover:text-foreground hover:bg-neutral/10 rounded-md transition-colors"
        title="텔레그램 복사"
      >
        ✈️ 텔레그램
      </button>
    </div>
  );
}
