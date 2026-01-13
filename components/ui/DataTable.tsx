import { ChangeIndicator } from "./ChangeIndicator";
import { formatCurrency, formatPercent, formatCompact } from "@/lib/utils";

type FormatType = "currency" | "percent" | "number" | "compact" | "ratio";

interface DataRow {
  label: string;
  current: number | string;
  previous?: number | string;
  change_pct?: number;
  format?: FormatType;
}

interface DataTableProps {
  data: DataRow[];
}

function formatValue(value: number | string, format?: FormatType): string {
  if (typeof value === "string") return value;

  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return `${value.toFixed(2)}%`;
    case "compact":
      return formatCompact(value);
    case "ratio":
      return value.toFixed(4);
    case "number":
    default:
      return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
}

export function DataTable({ data }: DataTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral text-xs">
            <th className="py-1.5 pr-4 font-medium">지표</th>
            <th className="py-1.5 px-4 font-medium text-right">이전</th>
            <th className="py-1.5 px-4 font-medium text-right">현재</th>
            <th className="py-1.5 pl-4 font-medium text-right">변화</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
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
              </td>
              <td className="py-2 px-4 text-right text-neutral tabular-nums">
                {row.previous !== undefined
                  ? formatValue(row.previous, row.format)
                  : "-"}
              </td>
              <td className="py-2 px-4 text-right text-foreground tabular-nums font-medium">
                {formatValue(row.current, row.format)}
              </td>
              <td className="py-2 pl-4 text-right">
                {row.change_pct !== undefined ? (
                  <ChangeIndicator change={row.change_pct} />
                ) : (
                  <span className="text-neutral">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
