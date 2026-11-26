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
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Authentication Required
            </span>
          </div>
          <CardTitle className="pt-1">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="auth-gate-email"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Email
              </label>
              <input
                id="auth-gate-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="auth-gate-password"
                className="block text-xs font-medium text-slate-600 dark:text-slate-300"
              >
                Password
              </label>
              <input
                id="auth-gate-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
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

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Need an account or Google Sign-In?{" "}
              <Link
                to="/register"
                className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
              >
                Register
              </Link>{" "}
              or{" "}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
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
