import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { MarketProvider } from "@/context/MarketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { OverviewPage } from "@/pages/OverviewPage";
import { ExploreStocksPage } from "@/pages/ExploreStocksPage";
import { ShellRoutePage } from "@/pages/ShellRoutePage";

function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        Page not found
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        The requested route does not exist in TradeX.
      </p>
      <Link to="/">
        <Button variant="primary">Back to Overview</Button>
      </Link>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MarketProvider>
          <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/stocks" element={<ExploreStocksPage />} />
              <Route
                path="/stocks/:symbol"
                element={
                  <ShellRoutePage
                    title="Stock Details"
                    description="Live price updates, intraday range, volume, and price history chart."
                    milestone="Group 4"
                  />
                }
              />
              <Route
                path="/portfolio"
                element={
                  <ShellRoutePage
                    title="My Portfolio"
                    description="Available cash, holdings valuation, and unrealized P&L."
                    milestone="Group 6"
                  />
                }
              />
              <Route
                path="/orders"
                element={
                  <ShellRoutePage
                    title="Orders"
                    description="Executed and historical BUY/SELL order records."
                    milestone="Group 6"
                  />
                }
              />
              <Route
                path="/transactions"
                element={
                  <ShellRoutePage
                    title="Transactions"
                    description="Debit and credit cash ledger for executed orders."
                    milestone="Group 6"
                  />
                }
              />
              <Route
                path="/watchlist"
                element={
                  <ShellRoutePage
                    title="Watchlist"
                    description="Tracked stocks and quick market access."
                    milestone="Group 7"
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <ShellRoutePage
                    title="Settings"
                    description="Account profile, authentication session, and display preferences."
                    milestone="Group 7"
                  />
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </MarketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
