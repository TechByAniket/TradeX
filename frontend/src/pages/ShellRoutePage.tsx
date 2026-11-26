import { useParams, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/Card";

interface ShellRoutePageProps {
  title: string;
  description: string;
  milestone: string;
}

export function ShellRoutePage({
  title,
  description,
  milestone,
}: ShellRoutePageProps) {
  const { symbol } = useParams<{ symbol?: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {symbol ? `${title} — ${symbol.toUpperCase()}` : title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module scheduled for {milestone}</CardTitle>
          <CardDescription>
            Group 1 establishes the TradeX application shell, design system,
            centralized Axios client, and routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 dark:text-slate-300">
          {query ? (
            <p>
              Search query received:{" "}
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {query}
              </span>
            </p>
          ) : (
            <p>
              No placeholder financial figures are rendered here. Live backend
              data and actions will be connected in {milestone}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
