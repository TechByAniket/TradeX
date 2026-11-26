import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearStoredToken,
  getStoredToken,
  registerUnauthorizedHandler,
} from "@/services/apiClient";
import { fetchCurrentUser } from "@/services/authService";
import type { AuthPortfolioSummary, AuthUser } from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  portfolio: AuthPortfolioSummary | null;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [portfolio, setPortfolio] = useState<AuthPortfolioSummary | null>(null);
  const [authLoading, setAuthLoading] = useState(() => Boolean(getStoredToken()));

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
    setPortfolio(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      setPortfolio(null);
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetchCurrentUser();
      setUser(res.user);
      setPortfolio(res.portfolio);
    } catch {
      setUser(null);
      setPortfolio(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setUser(null);
      setPortfolio(null);
    });
    void refreshAuth();
  }, [refreshAuth]);

  const value = useMemo(
    () => ({
      user,
      portfolio,
      authLoading,
      refreshAuth,
      logout,
    }),
    [user, portfolio, authLoading, refreshAuth, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
