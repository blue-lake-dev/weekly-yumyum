import { formatCurrency, formatCompact, formatNumber, formatPercent, formatRatio, getSourceLabel } from "@/lib/utils";
import type { DataSource } from "@/lib/types";

type FormatType = "currency" | "percent" | "number" | "compact" | "ratio";

interface DataRow {
  label: string;
  current: number | string | null;
  format?: FormatType;
  error?: string;
  source?: DataSource;
  isManual?: boolean;
  sourceUrl?: string;
}

interface DataTableProps {
  data: DataRow[];
  onEdit?: (label: string) => void;
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

export function DataTable({ data, onEdit }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral text-xs">
            <th className="py-1.5 pr-4 font-medium">지표</th>
            <th className="py-1.5 px-4 font-medium text-right">현재</th>
            <th className="py-1.5 pl-4 font-medium text-right">소스</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const hasError = !!row.error && !row.isManual;
            const isEditable = row.isManual && onEdit;

            return (
              <tr
                key={row.label}
                className={`
                  border-t border-neutral/10
                  hover:bg-neutral/5 transition-colors
                  ${index % 2 === 0 ? "bg-transparent" : "bg-neutral/[0.02]"}
                `}
              >
                <td className="py-2 pr-4 font-medium text-foreground">
                  {row.label}
                  {row.isManual && (
                    <span className="ml-1 text-xs text-neutral" title="수동 입력 필드">
                      ✏️
                    </span>
                  )}
                </td>
                <td className="py-2 px-4 text-right tabular-nums font-medium">
                  {hasError ? (
                    <span
                      className="text-amber-600 cursor-help"
                      title={row.error}
                    >
                      ⚠️ 조회실패
                    </span>
                  ) : (
                    <span className="text-foreground">
                      {formatValue(row.current, row.format)}
                      {isEditable && (
                        <button
                          onClick={() => onEdit(row.label)}
                          className="ml-1 text-neutral hover:text-foreground"
                          title="편집"
                        >
                          ✏️
                        </button>
                      )}
                    </span>
                  )}
                </td>
                <td className="py-2 pl-4 text-right text-xs text-neutral">
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                      title="데이터 소스 보기"
                    >
                      {getSourceLabel(row.source)}
                      <span>↗</span>
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
