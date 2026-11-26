import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "neutral" | "gain" | "loss" | "warning" | "glass";
export type BadgeSize = "sm" | "md";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const BADGE_VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral:
    "border border-[var(--tx-border)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text-secondary)]",
  gain: "border border-[var(--tx-gain-border)] bg-[var(--tx-gain-bg)] text-[var(--tx-gain)]",
  loss: "border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] text-[var(--tx-loss)]",
  warning:
    "border border-[var(--tx-warning-border)] bg-[var(--tx-warning-bg)] text-[var(--tx-warning)]",
  glass: "tx-glass text-[var(--tx-text-secondary)]",
};

const BADGE_SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] rounded-md",
  md: "px-2.5 py-1 text-xs rounded-md",
};

export function Badge({
  variant = "neutral",
  size = "sm",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tracking-wide tabular-nums",
        BADGE_VARIANT_CLASSES[variant],
        BADGE_SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
