import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Moon, Search, Sun, User } from "lucide-react";
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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/stocks?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate("/stocks");
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>

        <form
          onSubmit={handleSearchSubmit}
          className="relative hidden w-full max-w-sm sm:block"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stocks by symbol or name..."
            aria-label="Search stocks"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900"
          />
        </form>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <MarketBadge
          connectionStatus={connectionStatus}
          className="hidden sm:inline-flex"
        />

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        <Link
          to="/settings"
          className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <User className="h-3.5 w-3.5" />
          </span>
          <span className="hidden max-w-28 truncate sm:inline">
            {user?.name ?? "Account"}
          </span>
        </Link>
      </div>
    </header>
  );
}
