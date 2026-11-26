import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--tx-primary)] text-[var(--tx-primary-fg)] hover:bg-[var(--tx-primary-hover)] shadow-[0_1px_2px_rgba(0,0,0,0.28)] focus-visible:ring-[var(--tx-border-hover)]",
  secondary:
    "border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)] hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-hover)] focus-visible:ring-[var(--tx-border-hover)]",
  outline:
    "border border-[var(--tx-border)] bg-transparent text-[var(--tx-text-secondary)] hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-glass)] hover:text-[var(--tx-text)] focus-visible:ring-[var(--tx-border-hover)]",
  ghost:
    "text-[var(--tx-text-secondary)] hover:bg-[var(--tx-glass)] hover:text-[var(--tx-text)] focus-visible:ring-[var(--tx-border-hover)]",
  destructive:
    "border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] text-[var(--tx-loss)] hover:bg-red-500/15 hover:border-red-500/35 focus-visible:ring-red-400/30",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-[13px] rounded-lg",
  lg: "h-10 px-5 text-sm rounded-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-semibold tracking-[-0.01em] transition-all duration-150 ease-out active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-45",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}
