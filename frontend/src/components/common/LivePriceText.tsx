import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn, formatINR } from "@/lib/utils";

interface LivePriceTextProps {
  price: number;
  className?: string;
}

export function LivePriceText({ price, className }: LivePriceTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const prevPriceRef = useRef<number>(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const prev = prevPriceRef.current;
    if (price === prev) return;
    prevPriceRef.current = price;

    if (prefersReducedMotion) return;

    setFlash(price > prev ? "up" : "down");
    const timer = window.setTimeout(() => {
      setFlash(null);
    }, 850);

    return () => window.clearTimeout(timer);
  }, [price, prefersReducedMotion]);

  return (
    <span
      className={cn(
        "inline-block rounded-md px-1.5 py-0.5 -mx-1.5 -my-0.5 tabular-nums transition-colors duration-500 ease-out",
        flash === "up" && "bg-[var(--tx-gain-bg)]",
        flash === "down" && "bg-[var(--tx-loss-bg)]",
        className
      )}
    >
      {formatINR(price)}
    </span>
  );
}
