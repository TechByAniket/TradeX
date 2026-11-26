import { cn } from "@/lib/utils";
import type { SocketConnectionStatus } from "@/context/MarketContext";

interface MarketBadgeProps {
  connectionStatus?: SocketConnectionStatus;
  className?: string;
}

const STATUS_DOT: Record<SocketConnectionStatus, string> = {
  live: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]",
  connecting: "bg-amber-400",
  reconnecting: "bg-amber-400",
  offline: "bg-red-400",
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
      title="Prices are driven by the backend market simulator and do not reflect live exchange feeds"
      className={cn(
        "tx-glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.09em] text-[var(--tx-text-secondary)]",
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          connectionStatus ? STATUS_DOT[connectionStatus] : "bg-emerald-400"
        )}
      />
      <span className="text-[var(--tx-text)]">SIMULATED MARKET</span>
      {connectionStatus && (
        <span className="border-l border-[var(--tx-border-strong)] pl-2 font-medium tracking-[0.03em] text-[var(--tx-text-muted)]">
          {STATUS_LABEL[connectionStatus]}
        </span>
      )}
    </span>
  );
}
