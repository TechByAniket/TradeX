import { cn } from "@/lib/utils";

interface BrandLogoProps {
  collapsed?: boolean;
  className?: string;
}

export function BrandLogo({ collapsed = false, className }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] shadow-xs">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 16L9.5 10.5L13.5 14.5L20 7"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15.5 7H20V11.5"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex items-baseline gap-1">
          <span className="text-[17px] font-bold tracking-[-0.03em] text-[var(--tx-text)]">
            Trade
            <span className="font-semibold text-[var(--tx-text-secondary)]">
              X
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
