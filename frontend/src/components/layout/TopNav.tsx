import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { useTheme } from "@/context/ThemeContext";
import { cn, formatINR } from "@/lib/utils";

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

function formatMemberDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { connectionStatus } = useMarket();
  const { user, portfolio, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && accountMenuOpen) {
        setAccountMenuOpen(false);
        return;
      }

      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;
      if (isEditable) return;

      if (searchInputRef.current && searchInputRef.current.offsetParent !== null) {
        event.preventDefault();
        searchInputRef.current.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!user) {
      setAccountMenuOpen(false);
    }
  }, [user]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/stocks?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/stocks");
    }
  };

  const userInitial = user?.name?.trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[var(--tx-border)] bg-[var(--tx-glass-strong)] px-4 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-secondary)] transition-colors hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)] hover:text-[var(--tx-text)] lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        <form
          onSubmit={handleSearchSubmit}
          className="hidden w-full max-w-sm sm:block lg:max-w-md"
        >
          <Input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search NSE stocks by symbol or name..."
            aria-label="Search stocks"
            leftIcon={<Search className="h-3.5 w-3.5" />}
            rightElement={
              !searchQuery ? (
                <kbd
                  aria-hidden="true"
                  className="hidden rounded border border-[var(--tx-border)] bg-[var(--tx-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--tx-text-muted)] md:inline-block"
                >
                  /
                </kbd>
              ) : undefined
            }
          />
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-2.5">
        <Link
          to="/stocks"
          aria-label="Search stocks"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-secondary)] transition-colors hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)] hover:text-[var(--tx-text)] sm:hidden"
        >
          <Search className="h-4 w-4" />
        </Link>

        <MarketBadge
          connectionStatus={connectionStatus}
          className="hidden sm:inline-flex"
        />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface)] text-[var(--tx-text-secondary)] transition-colors hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)] hover:text-[var(--tx-text)]"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {!user ? (
          <Link
            to="/login"
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface)] px-2.5 text-[13px] font-medium text-[var(--tx-text)] transition-colors hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[11px] font-semibold text-[var(--tx-text-secondary)]">
              <User className="h-3.5 w-3.5" />
            </span>
            <span className="hidden sm:inline">Sign in</span>
          </Link>
        ) : (
          <div ref={accountMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label="Open account details"
              className={cn(
                "flex h-9 cursor-pointer items-center gap-2 rounded-lg border bg-[var(--tx-surface)] px-2.5 text-[13px] font-medium text-[var(--tx-text)] transition-colors",
                accountMenuOpen
                  ? "border-[var(--tx-border-hover)] bg-[var(--tx-surface-elevated)]"
                  : "border-[var(--tx-border)] hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)]"
              )}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[11px] font-semibold text-[var(--tx-text-secondary)]">
                {userInitial || <User className="h-3.5 w-3.5" />}
              </span>
              <span className="hidden max-w-28 truncate sm:inline">
                {user.name}
              </span>
              <ChevronDown
                className={cn(
                  "hidden h-3.5 w-3.5 text-[var(--tx-text-muted)] transition-transform duration-150 sm:block",
                  accountMenuOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {accountMenuOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute top-full right-0 z-30 mt-2 w-72 rounded-xl border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] p-4 shadow-[var(--tx-shadow-glass)] sm:w-80"
                >
                  <div className="flex items-center gap-3 border-b border-[var(--tx-border)] pb-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-xs font-semibold text-[var(--tx-text)]">
                      {userInitial || <User className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--tx-text)]">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-[var(--tx-text-muted)]">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-[var(--tx-border)] py-1 text-xs">
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-[var(--tx-text-muted)]">
                        Name
                      </dt>
                      <dd className="min-w-0 truncate text-right font-medium text-[var(--tx-text)]">
                        {user.name}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-[var(--tx-text-muted)]">
                        Email
                      </dt>
                      <dd className="min-w-0 truncate text-right font-medium text-[var(--tx-text)]">
                        {user.email}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-[var(--tx-text-muted)]">
                        Balance
                      </dt>
                      <dd className="text-right font-semibold tabular-nums text-[var(--tx-text)]">
                        {portfolio
                          ? formatINR(Number(portfolio.cash_balance))
                          : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-[var(--tx-text-muted)]">
                        Member since
                      </dt>
                      <dd className="text-right font-medium text-[var(--tx-text)]">
                        {formatMemberDate(user.created_at)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2.5">
                      <dt className="shrink-0 text-[var(--tx-text-muted)]">
                        Account status
                      </dt>
                      <dd>
                        <Badge
                          variant={user.is_active ? "gain" : "loss"}
                          size="sm"
                        >
                          {user.is_active ? "Active" : "Disabled"}
                        </Badge>
                      </dd>
                    </div>
                  </dl>

                  <div className="border-t border-[var(--tx-border)] pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
}
