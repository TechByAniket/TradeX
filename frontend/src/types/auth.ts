export interface AuthUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthPortfolioSummary {
  id: string;
  cash_balance: string;
  currency: string;
}

export interface AuthResponse {
  success: true;
  token: string;
  user: AuthUser;
  portfolio: AuthPortfolioSummary | null;
  isNewUser?: boolean;
}

export interface MeResponse {
  success: true;
  user: AuthUser;
  portfolio: AuthPortfolioSummary | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GoogleAuthPayload {
  idToken: string;
}
