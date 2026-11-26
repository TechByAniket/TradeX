import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "elevated" | "glass";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

const CARD_VARIANT_CLASSES: Record<CardVariant, string> = {
  default: "tx-surface",
  elevated: "tx-surface-elevated",
  glass: "tx-glass",
};

export function Card({
  variant = "default",
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl transition-colors duration-200",
        CARD_VARIANT_CLASSES[variant],
        interactive && "hover:border-[var(--tx-border-hover)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 px-5 pt-5 pb-3 sm:px-6", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-[15px] font-semibold tracking-[-0.015em] text-[var(--tx-text)]",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "text-[13px] leading-relaxed text-[var(--tx-text-secondary)]",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5 sm:px-6", className)} {...props} />;
}
