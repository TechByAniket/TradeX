import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputBaseClassName =
  "h-9 w-full rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface-muted)] px-3 text-[13px] font-normal text-[var(--tx-text)] placeholder:text-[var(--tx-text-muted)] transition-all duration-150 focus:border-[var(--tx-border-hover)] focus:bg-[var(--tx-surface-elevated)] focus:outline-none focus:ring-2 focus:ring-[var(--tx-border)] disabled:cursor-not-allowed disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    hint,
    error,
    leftIcon,
    rightElement,
    className,
    containerClassName,
    ...props
  },
  ref
) {
  return (
    <div className={cn("w-full", containerClassName)}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-xs font-medium tracking-[-0.005em] text-[var(--tx-text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 flex items-center text-[var(--tx-text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            inputBaseClassName,
            leftIcon && "pl-9",
            rightElement && "pr-9",
            error &&
              "border-[var(--tx-loss-border)] focus:border-[var(--tx-loss)] focus:ring-red-500/15",
            className
          )}
          {...props}
        />
        {rightElement && (
          <span className="absolute right-2.5 flex items-center text-[var(--tx-text-muted)]">
            {rightElement}
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-[var(--tx-loss)]">
          {error}
        </p>
      ) : (
        hint && (
          <p className="mt-1.5 text-xs text-[var(--tx-text-muted)]">{hint}</p>
        )
      )}
    </div>
  );
});
