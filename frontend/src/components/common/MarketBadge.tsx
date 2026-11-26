import { cn } from "@/lib/utils";
import type { SocketConnectionStatus } from "@/context/MarketContext";

interface MarketBadgeProps {
  connectionStatus?: SocketConnectionStatus;
  className?: string;
}

const STATUS_DOT: Record<SocketConnectionStatus, string> = {
  live: "bg-emerald-500",
  connecting: "bg-amber-500",
  reconnecting: "bg-amber-500",
  offline: "bg-rose-500",
};

const STATUS_LABEL: Record<SocketConnectionStatus, string> = {
  live: "Live",
  connecting: "Connecting",
  reconnecting: "Reconnecting",
  offline: "Offline",
};

export function MarketBadge({
  connectionStatus,
  className,
}: MarketBadgeProps) {
  return (
    <span
      title="Prices are driven by the backend market simulator"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium tracking-wide text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connectionStatus ? STATUS_DOT[connectionStatus] : "bg-amber-500"
        )}
      />
      <span>SIMULATED MARKET</span>
      {connectionStatus && (
        <span className="border-l border-amber-300/70 pl-1.5 font-normal text-amber-700 dark:border-amber-800 dark:text-amber-300/90">
          {STATUS_LABEL[connectionStatus]}
        </span>
      )}
    </span>
  );
}
