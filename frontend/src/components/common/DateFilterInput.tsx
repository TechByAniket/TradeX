import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatShortDate } from "@/lib/utils";

interface DateFilterInputProps {
  id: string;
  value: string;
  onChange: (nextDate: string) => void;
  ariaLabel?: string;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getTodayKey(): string {
  const now = new Date();
  return formatDateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseMonthYear(dateKey: string): { year: number; month: number } {
  const [y, m] = dateKey.split("-").map(Number);
  if (y && m && m >= 1 && m <= 12) {
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

interface CalendarCell {
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
}

function buildCalendarGrid(year: number, month: number): CalendarCell[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, day);
    cells.push({
      dateKey: formatDateKey(
        prevDate.getFullYear(),
        prevDate.getMonth(),
        prevDate.getDate()
      ),
      day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      dateKey: formatDateKey(year, month, day),
      day,
      inCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextDate = new Date(year, month + 1, day);
    cells.push({
      dateKey: formatDateKey(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate()
      ),
      day,
      inCurrentMonth: false,
    });
  }

  return cells;
}

/** Compact calendar icon trigger opening an opaque custom date-picker popover. */
export function DateFilterInput({
  id,
  value,
  onChange,
  ariaLabel = "Filter by date",
  className,
}: DateFilterInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const initialView = parseMonthYear(value);
  const [viewYear, setViewYear] = useState(initialView.year);
  const [viewMonth, setViewMonth] = useState(initialView.month);

  useEffect(() => {
    if (!open) return;
    const nextView = parseMonthYear(value);
    setViewYear(nextView.year);
    setViewMonth(nextView.month);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
      }).format(new Date(viewYear, viewMonth, 1)),
    [viewYear, viewMonth]
  );

  const cells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const todayKey = getTodayKey();

  const shiftMonth = (delta: number) => {
    const shifted = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(shifted.getFullYear());
    setViewMonth(shifted.getMonth());
  };

  const handleSelectDate = (dateKey: string) => {
    onChange(dateKey === value ? "" : dateKey);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative shrink-0", className)}>
      <button
        id={id}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={
          value ? `${ariaLabel} (${formatShortDate(value)})` : ariaLabel
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        title={value ? `Filtered: ${formatShortDate(value)}` : ariaLabel}
        className={cn(
          "relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tx-border-hover)]",
          open || value
            ? "border-[var(--tx-border-hover)] bg-[var(--tx-surface-elevated)] text-[var(--tx-text)]"
            : "border-[var(--tx-border)] bg-[var(--tx-surface-muted)] text-[var(--tx-text-secondary)] hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)] hover:text-[var(--tx-text)]"
        )}
      >
        <Calendar className="h-4 w-4" />
        {value && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400"
          />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Select date"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 z-30 mt-2 w-[280px] rounded-xl border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] p-3.5 shadow-[var(--tx-shadow-glass)]"
          >
            {/* Month / Year header */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-secondary)] transition-colors hover:border-[var(--tx-border-hover)] hover:text-[var(--tx-text)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <span className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--tx-text)]">
                {monthLabel}
              </span>

              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-secondary)] transition-colors hover:border-[var(--tx-border-hover)] hover:text-[var(--tx-text)]"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="mb-1.5 grid grid-cols-7 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="tx-label py-1 text-[10px]">
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell) => {
                const isSelected = cell.dateKey === value;
                const isToday = cell.dateKey === todayKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateKey)}
                    className={cn(
                      "flex h-8 w-full cursor-pointer items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-colors duration-100",
                      isSelected
                        ? "bg-[var(--tx-primary)] font-semibold text-[var(--tx-primary-fg)] shadow-2xs"
                        : isToday
                          ? "border border-[var(--tx-border-hover)] bg-[var(--tx-surface)] text-[var(--tx-text)] hover:bg-[var(--tx-surface-hover)]"
                          : cell.inCurrentMonth
                            ? "text-[var(--tx-text-secondary)] hover:bg-[var(--tx-surface-hover)] hover:text-[var(--tx-text)]"
                            : "text-[var(--tx-text-muted)] opacity-45 hover:bg-[var(--tx-surface-hover)] hover:opacity-80"
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--tx-border)] pt-2.5">
              <span className="truncate text-[11px] tabular-nums text-[var(--tx-text-muted)]">
                {value ? formatShortDate(value) : "All dates"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayKey);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--tx-text-secondary)] transition-colors hover:bg-[var(--tx-surface-hover)] hover:text-[var(--tx-text)]"
                >
                  Today
                </button>
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-[var(--tx-loss)] transition-colors hover:bg-[var(--tx-loss-bg)]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
