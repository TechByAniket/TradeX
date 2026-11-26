import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
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
import { getApiErrorMessage, setStoredToken } from "@/services/apiClient";
import { loginUser } from "@/services/authService";

interface AuthRequiredCardProps {
  title: string;
  description: string;
}

export function AuthRequiredCard({
  title,
  description,
}: AuthRequiredCardProps) {
  const { refreshAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await loginUser({
        email: email.trim(),
        password,
      });
      setStoredToken(res.token);
      setPassword("");
      await refreshAuth();
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center gap-2 text-[var(--tx-text-secondary)]">
            <Lock className="h-3.5 w-3.5" />
            <span className="tx-label">Authentication Required</span>
          </div>
          <CardTitle className="pt-1.5 text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="auth-gate-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <Input
              id="auth-gate-password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />

            {error && (
              <p className="text-xs font-medium text-[var(--tx-loss)]">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <p className="text-center text-xs text-[var(--tx-text-muted)]">
              Need an account or Google Sign-In?{" "}
              <Link
                to="/register"
                className="font-medium text-[var(--tx-text)] underline decoration-[var(--tx-border-hover)] underline-offset-4 transition-colors hover:opacity-80"
              >
                Register
              </Link>{" "}
              or{" "}
              <Link
                to="/login"
                className="font-medium text-[var(--tx-text)] underline decoration-[var(--tx-border-hover)] underline-offset-4 transition-colors hover:opacity-80"
              >
                Use Google SSO
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
