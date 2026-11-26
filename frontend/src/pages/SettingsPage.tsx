import { Link } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { formatINR } from "@/lib/utils";

function formatMemberDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function SettingsPage() {
  const { user, portfolio, authLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="border-b border-[var(--tx-border)] pb-6">
        <p className="text-xs font-medium tracking-[0.02em] text-[var(--tx-text-muted)]">
          Session &amp; Preferences
        </p>
        <h1 className="tx-heading-page mt-1.5 text-2xl sm:text-[26px]">
          Settings
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--tx-text-secondary)]">
          Inspect your TradeX account session and terminal display preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Account Details */}
        <Card>
          <CardHeader className="border-b border-[var(--tx-border)] pb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--tx-text-muted)]" />
              <CardTitle className="tx-heading-section">
                Account Details
              </CardTitle>
            </div>
            <CardDescription>
              Profile information retrieved from your authenticated session
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            {authLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-48 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
                <div className="h-5 w-56 animate-pulse rounded bg-[var(--tx-surface-elevated)]" />
              </div>
            ) : !user ? (
              <div className="space-y-4">
                <p className="text-[13px] leading-relaxed text-[var(--tx-text-secondary)]">
                  You are currently browsing without signing in. Sign in or
                  create an account to receive ₹1,00,000 in virtual cash and
                  place orders.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <Link to="/login">
                    <Button variant="primary" size="md">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button variant="secondary" size="md">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <dl className="divide-y divide-[var(--tx-border)] text-[13px]">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--tx-text-muted)]">Name</dt>
                    <dd className="font-medium text-[var(--tx-text)]">
                      {user.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--tx-text-muted)]">Email</dt>
                    <dd className="font-medium text-[var(--tx-text)]">
                      {user.email}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--tx-text-muted)]">
                      Account Status
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
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-[var(--tx-text-muted)]">
                      Member Since
                    </dt>
                    <dd className="font-medium text-[var(--tx-text)]">
                      {formatMemberDate(user.created_at)}
                    </dd>
                  </div>
                  {portfolio && (
                    <div className="flex items-center justify-between py-3">
                      <dt className="text-[var(--tx-text-muted)]">
                        Portfolio Cash ({portfolio.currency})
                      </dt>
                      <dd className="font-semibold tabular-nums text-[var(--tx-text)]">
                        {formatINR(Number(portfolio.cash_balance))}
                      </dd>
                    </div>
                  )}
                </dl>

                <div>
                  <Button variant="secondary" size="md" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display Preferences */}
        <Card>
          <CardHeader className="border-b border-[var(--tx-border)] pb-4">
            <CardTitle className="tx-heading-section">Appearance</CardTitle>
            <CardDescription>
              Saved locally in your browser preferences
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--tx-border)] bg-[var(--tx-bg)]/60 p-4">
              <div>
                <p className="text-[13px] font-medium text-[var(--tx-text)]">
                  Theme Preference
                </p>
                <p className="mt-0.5 text-xs text-[var(--tx-text-muted)]">
                  Currently using{" "}
                  {theme === "dark" ? "Obsidian Dark" : "Monochrome Light"} mode
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4" />
                    Switch to Light
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4" />
                    Switch to Dark
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
