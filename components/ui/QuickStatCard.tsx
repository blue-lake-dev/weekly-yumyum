import { ReactNode } from "react";

interface QuickStatCardProps {
  label: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Reusable card wrapper for QuickStats section
 * Consistent styling with min-width for horizontal scroll layout
 */
export function QuickStatCard({
  label,
  subtitle,
  children,
  className = "",
}: QuickStatCardProps) {
  return (
    <div
      className={`
        flex-shrink-0 min-w-[160px]
        rounded-xl bg-white p-4 shadow-sm
        flex flex-col
        ${className}
      `}
    >
      <div className="mb-2">
        <p className="font-semibold text-xs text-[#6B7280]">{label}</p>
        {subtitle && <p className="text-[10px] text-[#9CA3AF]">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
