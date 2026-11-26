import { cn } from "@/lib/utils";

interface MarketBadgeProps {
  className?: string;
}

export function MarketBadge({ className }: MarketBadgeProps) {
  return (
    <span
      title="Prices are driven by the backend market simulator"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      SIMULATED MARKET
    </span>
  );
}
