import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { Button } from "@/components/common/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { useAuth } from "@/context/AuthContext";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import { getApiErrorMessage, setStoredToken } from "@/services/apiClient";
import {
  loginUser,
  loginWithGoogle,
  registerUser,
} from "@/services/authService";

interface AuthPageProps {
  mode: "login" | "register";
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const { user, refreshAuth } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const isRegister = mode === "register";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = isRegister
        ? await registerUser({
            name: name.trim(),
            email: email.trim(),
            password,
          })
        : await loginUser({
            email: email.trim(),
            password,
          });

      setStoredToken(response.token);
      await refreshAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          isRegister ? "Registration failed." : "Invalid email or password."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleCredential = async (idToken: string) => {
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await loginWithGoogle({ idToken });
      setStoredToken(response.token);
      await refreshAuth();
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Google sign-in failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <BrandLogo />
        <p className="text-xs text-[var(--tx-text-muted)]">
          Simulated Indian Stock Trading Terminal
        </p>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="tx-heading-section text-lg">
            {isRegister ? "Create your TradeX account" : "Sign in to TradeX"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "New accounts automatically receive ₹1,00,000 in virtual cash."
              : "Access your virtual portfolio, orders, and trading tools."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <Input
                id="auth-name"
                label="Full Name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aniket Sharma"
              />
            )}

            <Input
              id="auth-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              id="auth-password"
              label="Password"
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "Minimum 8 characters" : "Enter password"}
            />

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[var(--tx-loss-border)] bg-[var(--tx-loss-bg)] px-3 py-2 text-xs text-[var(--tx-loss)]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={submitting}
            >
              {submitting
                ? isRegister
                  ? "Creating account..."
                  : "Signing in..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </Button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[var(--tx-border)]" />
            <span className="tx-label mx-3">or</span>
            <div className="flex-grow border-t border-[var(--tx-border)]" />
          </div>

          <GoogleSignInButton
            text={isRegister ? "signup_with" : "signin_with"}
            onCredential={(idToken) => {
              void handleGoogleCredential(idToken);
            }}
          />

          <p className="pt-1 text-center text-xs text-[var(--tx-text-muted)]">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-[var(--tx-text)] underline decoration-[var(--tx-border-hover)] underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-[var(--tx-text)] underline decoration-[var(--tx-border-hover)] underline-offset-4 transition-opacity hover:opacity-80"
                >
                  Create one
                </Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
