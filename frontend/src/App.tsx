import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/context/AuthContext";
import { MarketProvider } from "@/context/MarketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/common/Button";
import { AuthPage } from "@/pages/AuthPage";
import { ExploreStocksPage } from "@/pages/ExploreStocksPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { PortfolioPage } from "@/pages/PortfolioPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StockDetailsPage } from "@/pages/StockDetailsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";

function NotFoundPage() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="tx-heading-page text-xl">Page not found</h1>
      <p className="text-sm text-[var(--tx-text-secondary)]">
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
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AuthProvider>
          <MarketProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<OverviewPage />} />
                  <Route path="/login" element={<AuthPage mode="login" />} />
                  <Route
                    path="/register"
                    element={<AuthPage mode="register" />}
                  />
                  <Route path="/stocks" element={<ExploreStocksPage />} />
                  <Route path="/stocks/:symbol" element={<StockDetailsPage />} />
                  <Route path="/portfolio" element={<PortfolioPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
          </MarketProvider>
        </AuthProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}

export default App;
