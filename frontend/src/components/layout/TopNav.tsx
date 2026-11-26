import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Moon, Search, Sun, User } from "lucide-react";
import { Input } from "@/components/common/Input";
import { MarketBadge } from "@/components/common/MarketBadge";
import { useAuth } from "@/context/AuthContext";
import { useMarket } from "@/context/MarketContext";
import { useTheme } from "@/context/ThemeContext";

interface TopNavProps {
  onOpenMobileMenu: () => void;
}

export function TopNav({ onOpenMobileMenu }: TopNavProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { connectionStatus } = useMarket();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
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
  }, []);

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

        <Link
          to={user ? "/settings" : "/login"}
          className="flex h-9 items-center gap-2 rounded-lg border border-[var(--tx-border)] bg-[var(--tx-surface)] px-2.5 text-[13px] font-medium text-[var(--tx-text)] transition-colors hover:border-[var(--tx-border-hover)] hover:bg-[var(--tx-surface-elevated)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--tx-border-strong)] bg-[var(--tx-surface-elevated)] text-[11px] font-semibold text-[var(--tx-text-secondary)]">
            {userInitial ? userInitial : <User className="h-3.5 w-3.5" />}
          </span>
          <span className="hidden max-w-28 truncate sm:inline">
            {user?.name ?? "Sign in"}
          </span>
        </Link>
      </div>
    </header>
  );
}
