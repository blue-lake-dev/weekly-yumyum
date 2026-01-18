"use client";

import { useState } from "react";
import { formatCurrency, formatCompact, formatNumber, formatPercent, formatRatio, getSourceLabel } from "@/lib/utils";
import type { DataSource } from "@/lib/types";

type FormatType = "currency" | "percent" | "number" | "compact" | "ratio";

interface DataRow {
  label: string;
  current: number | string | null;
  current_at?: string; // Timestamp of current value
  previous?: number | string | null;
  previous_at?: string; // Timestamp of previous value
  change_pct?: number;
  format?: FormatType;
  error?: string;
  source?: DataSource;
  sourceUrl?: string; // URL to view source data
  isManual?: boolean;
  fieldPath?: string; // For editing current value
  previousFieldPath?: string; // For editing previous value (e.g., BTC Dominance)
}

interface DataTableProps {
  data: DataRow[];
  onUpdate?: (fieldPath: string, value: number | string | null) => void;
  disabled?: boolean; // Disable inputs while fetching
}

function formatValue(value: number | string | null | undefined, format?: FormatType): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;

  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return formatPercent(value);
    case "compact":
      return formatCompact(value);
    case "ratio":
      return formatRatio(value);
    case "number":
    default:
      return formatNumber(value);
  }
}

function formatChangePct(change_pct: number | undefined): { text: string; color: string; emoji: string } {
  if (change_pct === undefined || change_pct === null || isNaN(change_pct)) {
    return { text: "-", color: "text-neutral", emoji: "⚪" };
  }

  const sign = change_pct >= 0 ? "+" : "";
  const text = `${sign}${change_pct.toFixed(2)}%`;

  if (change_pct > 0) {
    return { text, color: "text-[var(--up)]", emoji: "" };
  } else if (change_pct < 0) {
    return { text, color: "text-[var(--down)]", emoji: "" };
  } else {
    return { text, color: "text-neutral", emoji: "⚪" };
  }
}

function ManualInput({
  value,
  fieldPath,
  onUpdate,
  disabled,
}: {
  value: number | string | null | undefined;
  fieldPath: string;
  onUpdate?: (fieldPath: string, value: number | string | null) => void;
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState(
    value !== null && value !== undefined ? String(value) : ""
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleBlur = async () => {
    if (!onUpdate || disabled) return;

    const trimmed = inputValue.trim();
    const newValue = trimmed === "" ? null : trimmed;

    // Only save if value changed
    const currentStr = value !== null && value !== undefined ? String(value) : null;
    if (newValue === currentStr) return;

    setIsSaving(true);
    try {
      onUpdate(fieldPath, newValue);
    } catch (error) {
      console.error("Failed to save:", error);
      setInputValue(value !== null && value !== undefined ? String(value) : "");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <input
      type="text"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleBlur}
      disabled={isSaving || disabled}
      className="w-20 px-1.5 py-0.5 text-right text-sm tabular-nums bg-white border border-neutral/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

export function DataTable({ data, onUpdate, disabled }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col className="w-[25%]" />
          <col className="w-[18%]" />
          <col className="w-[22%]" />
          <col className="w-[15%]" />
          <col className="w-[20%]" />
        </colgroup>
        <thead>
          <tr className="text-left text-neutral text-xs">
            <th className="py-1.5 pr-2 font-medium">지표</th>
            <th className="py-1.5 px-2 font-medium text-right">이전</th>
            <th className="py-1.5 px-2 font-medium text-right">현재</th>
            <th className="py-1.5 px-2 font-medium text-right">변화</th>
            <th className="py-1.5 pl-2 font-medium text-right">소스</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const hasError = !!row.error && !row.isManual;
            const showCurrentInput = row.isManual && onUpdate && row.fieldPath;
            const showPreviousInput = row.previousFieldPath && onUpdate;
            const change = formatChangePct(row.change_pct);

            return (
              <tr
                key={row.label}
                className={`
                  border-t border-neutral/10
                  hover:bg-neutral/5 transition-colors
                  ${index % 2 === 0 ? "bg-transparent" : "bg-neutral/[0.02]"}
                `}
              >
                {/* 지표 (Label) */}
                <td className="py-2 pr-2 font-medium text-foreground">
                  {row.label}
                  {(row.isManual || row.previousFieldPath) && (
                    <span className="ml-1 text-xs text-neutral" title="수동 입력">
                      ✏️
                    </span>
                  )}
                </td>

                {/* 이전 (Previous) */}
                <td className="py-2 px-2 text-right tabular-nums">
                  {showPreviousInput ? (
                    <ManualInput
                      value={row.previous}
                      fieldPath={row.previousFieldPath!}
                      onUpdate={onUpdate}
                      disabled={disabled}
                    />
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-neutral">
                        {formatValue(row.previous, row.format)}
                      </span>
                      {row.previous_at && (
                        <span className="text-[10px] text-neutral/60">
                          {row.previous_at}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* 현재 (Current) */}
                <td className="py-2 px-2 text-right tabular-nums font-medium">
                  {hasError ? (
                    <span
                      className="text-amber-600 cursor-help"
                      title={row.error}
                    >
                      ⚠️ 조회실패
                    </span>
                  ) : showCurrentInput ? (
                    <ManualInput
                      value={row.current}
                      fieldPath={row.fieldPath!}
                      onUpdate={onUpdate}
                      disabled={disabled}
                    />
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-foreground">
                        {formatValue(row.current, row.format)}
                      </span>
                      {row.current_at && (
                        <span className="text-[10px] text-neutral/60 font-normal">
                          {row.current_at}
                        </span>
                      )}
                    </div>
                  )}
                </td>

                {/* 변화 (Change) */}
                <td className={`py-2 px-2 text-right tabular-nums font-medium ${change.color}`}>
                  {change.emoji && <span className="mr-1">{change.emoji}</span>}
                  {change.text}
                </td>

                {/* 소스 (Source) */}
                <td className="py-2 pl-2 text-right text-neutral text-xs">
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground hover:underline"
                      title="데이터 소스 보기"
                    >
                      {getSourceLabel(row.source)}
                      <span className="ml-0.5">↗</span>
                    </a>
                  ) : (
                    getSourceLabel(row.source)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
