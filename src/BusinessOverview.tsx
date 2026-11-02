import { Link } from "react-router-dom";
import { Bell, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { useRead } from "./useRead";
export type BusinessSummary = {
  customers: {
    total: number;
    new_last_30_days: number;
    latest: { id: string; name: string; created_at: string }[];
  };
  live_payments: { records: number; gross: string | null };
  basis: string;
  revenue_available: false;
};
const money = (s: string | null) =>
  s === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(Number(s));
export function BusinessOverview({
  data,
}: {
  data?: BusinessSummary | null;
  version: number;
}) {
  if (!data) return null;
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <h2 className="font-semibold">Newest customers</h2>
        </CardHeader>
        <CardContent className="px-5 py-2">
          {data.customers.latest.slice(0, 3).map((customer) => (
            <Link
              key={customer.id}
              to={`/people?id=${encodeURIComponent(customer.id)}`}
              className="flex items-center gap-3 py-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold">
                {customer.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                  })}
                </p>
              </div>
              <ArrowUpRight size={14} />
            </Link>
          ))}
          {!data.customers.latest.length && (
            <p className="py-8 text-sm text-muted-foreground">
              No registered customers.
            </p>
          )}
          <Link
            to="/people"
            className="my-3 inline-block text-xs text-muted-foreground hover:underline"
          >
            View all customers →
          </Link>
        </CardContent>
      </Card>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <h2 className="font-semibold">Customers</h2>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-4xl font-semibold tracking-tight">
            {data.customers.total.toLocaleString("en-IN")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Total registered · all time
          </p>
          <div className="mt-8 border-t pt-5">
            <span className="text-2xl font-semibold text-emerald-700">
              +{data.customers.new_last_30_days.toLocaleString("en-IN")}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">
              New customers · last 30 days
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <CardHeader className="border-b bg-muted/20 px-5 py-4">
          <h2 className="font-semibold">Payments & revenue</h2>
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-4xl font-semibold tracking-tight">
            {money(data.live_payments.gross)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Live payment volume · before refunds
          </p>
          <div className="mt-6 border-t pt-4">
            <p className="text-sm">
              Revenue{" "}
              <span className="float-right text-muted-foreground">
                Unavailable
              </span>
            </p>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">About these figures</summary>
              <p className="mt-2">
                Verified net revenue reporting is not configured
              </p>
              <p className="mt-2">
                All-time live payment records, including later refunds. Excludes
                sandbox and wallet payments. Payment volume is not revenue.
                Business totals do not use journey filters.
              </p>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export function DashboardAlerts({ version }: { version: number }) {
  const result = useRead<Record<string, number>>(
    "/support-tickets/alerts",
    version,
  );
  const queues = [
    ["escalated", "Escalated support", "due=escalated"],
    ["first_response_overdue", "First response overdue", "response=overdue"],
    [
      "unacknowledged_overdue",
      "Follow-ups not acknowledged",
      "due=unacknowledged",
    ],
    [
      "awaiting_first_response",
      "Waiting for first response",
      "response=waiting",
    ],
  ];
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bell size={18} />
          Support alerts
        </h2>
        <p className="text-sm text-muted-foreground">
          Current queues in your staff scope · counts may overlap
        </p>
      </CardHeader>
      <CardContent className="px-5 py-2">
        {!result ? (
          <p className="py-8" role="status">
            Loading alerts…
          </p>
        ) : result.error ? (
          <p className="py-8 text-sm text-amber-800" role="alert">
            Alerts unavailable. {result.error}
          </p>
        ) : (
          queues.map(([key, label, query]) => (
            <Link
              key={key}
              to={`/support/tickets?${query}`}
              className="flex items-center justify-between gap-3 border-b py-4 last:border-0"
            >
              <span className="text-sm">{label}</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${result.data?.[key] ? "bg-amber-50 text-amber-800" : "bg-muted"}`}
              >
                {result.data?.[key] ?? "Unavailable"}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
