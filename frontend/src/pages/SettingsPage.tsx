import { Link } from "react-router-dom";
import { LogOut, Moon, Sun, User } from "lucide-react";
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
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your TradeX session and display preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Account Details */}
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>
              Profile information retrieved from your authenticated session
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            {authLoading ? (
              <div className="space-y-3">
                <div className="h-5 w-48 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-5 w-56 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : !user ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
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
                    <Button variant="outline" size="md">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800/80">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500 dark:text-slate-400">Name</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {user.name}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500 dark:text-slate-400">
                      Email
                    </dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {user.email}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500 dark:text-slate-400">
                      Account Status
                    </dt>
                    <dd className="inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {user.is_active ? "Active" : "Disabled"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-slate-500 dark:text-slate-400">
                      Member Since
                    </dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">
                      {formatMemberDate(user.created_at)}
                    </dd>
                  </div>
                  {portfolio && (
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500 dark:text-slate-400">
                        Portfolio Cash ({portfolio.currency})
                      </dt>
                      <dd className="font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                        {formatINR(Number(portfolio.cash_balance))}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="pt-2">
                  <Button variant="outline" size="md" onClick={logout}>
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
          <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Saved locally in your browser preferences
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Theme Preference
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Currently using {theme === "light" ? "Light" : "Dark"} mode
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "light" ? (
                  <>
                    <Moon className="h-4 w-4" />
                    Switch to Dark
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4" />
                    Switch to Light
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
