import {
  BusinessOverview,
  DashboardAlerts,
  type BusinessSummary,
} from "./BusinessOverview";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
} from "recharts";
import {
  ArrowUpRight,
  Route,
  Users,
  CheckCircle2,
  CreditCard,
  Search,
  ShieldAlert,
  TriangleAlert,
  ChartNoAxesCombined,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRead } from "./useRead";
import { useAuth } from "./useAuth";
export type OverviewBucket = { status: number; label: string; count: number };
const number = (n: number) => n.toLocaleString("en-IN");
const label = (s: string) =>
  s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
const colors = [
  "#059669",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#64748b",
  "#e11d48",
  "#06b6d4",
  "#475569",
];
const sum = (b: OverviewBucket[]) => b.reduce((n, x) => n + x.count, 0);
type Props = {
  business?: BusinessSummary | null;
  trips: OverviewBucket[];
  rides: OverviewBucket[];
  state: string;
  version: number;
  journeyLink: (kind: string, status?: number) => string;
};
export function OverviewDashboard({
  business,
  trips,
  rides,
  state,
  version,
  journeyLink,
}: Props) {
  const { session } = useAuth();
  const count = (items: OverviewBucket[], status: number) =>
    items.find((b) => b.status === status)?.count ?? 0;
  const stats = [
    {
      title: "Traveler trips",
      value: sum(trips),
      note: "Published journey records",
      icon: Route,
      kind: "trips",
    },
    {
      title: "Passenger rides",
      value: sum(rides),
      note: "All recorded ride requests",
      icon: Users,
      kind: "rides",
    },
    {
      title: "Completed trips",
      value: count(trips, 8),
      note: "Recorded as completed",
      icon: CheckCircle2,
      kind: "trips",
      status: 8,
    },
    {
      title: "Awaiting payment",
      value: count(rides, 3),
      note: "Ride status · not a payment verdict",
      icon: CreditCard,
      kind: "rides",
      status: 3,
    },
  ];
  return (
    <div className="space-y-6">
      <BusinessOverview data={business} version={version} />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_2fr]">
        {session?.staff.permissions.includes("support.tickets.read") && (
          <DashboardAlerts version={version} />
        )}
        <div
          className={
            session?.staff.permissions.includes("support.tickets.read")
              ? "min-w-0"
              : "min-w-0 xl:col-span-2"
          }
        >
          {" "}
          {session?.staff.permissions.includes("reports.read") && (
            <CreationTrend
              key={`${session.staff.id}:${state}`}
              state={state}
              version={version}
            />
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Active trips",
            value: trips
              .filter((b) => [5, 6, 7, 13].includes(b.status))
              .reduce((n, b) => n + b.count, 0),
            note: "Started, picking up, on the way or returning",
            url: "/tracking",
          },
          {
            title: "Active rides",
            value: rides
              .filter((b) => [6, 7].includes(b.status))
              .reduce((n, b) => n + b.count, 0),
            note: "Heading to pickup or passenger on board",
            url: journeyLink("rides"),
          },
          {
            title: "Disputed rides",
            value: count(rides, 14),
            note: "Ride status marked disputed",
            url: journeyLink("rides", 14),
          },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.url}
            className="rounded-xl border bg-white p-5"
          >
            <div className="flex justify-between text-sm text-muted-foreground">
              {item.title}
              <ArrowUpRight size={16} />
            </div>
            <p className="mt-3 text-3xl font-semibold">{number(item.value)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Within journey filters
            </p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card
            key={s.title}
            className="gap-0 overflow-hidden py-0 shadow-none"
          >
            <CardContent className="flex-1 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {s.title}
                </h2>
                <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <s.icon size={18} />
                </span>
              </div>
              <p className="mt-5 text-3xl font-semibold tracking-tight tabular-nums">
                {number(s.value)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
            </CardContent>
            <Link
              to={journeyLink(s.kind, s.status)}
              className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 text-xs font-medium hover:bg-muted/50"
            >
              View records <ArrowUpRight size={15} />
            </Link>
          </Card>
        ))}
      </div>
      <Card className="gap-0 py-0 shadow-none">
        <CardHeader className="border-b p-5">
          <h2 className="text-lg font-semibold">Needs attention</h2>
          <p className="text-sm text-muted-foreground">
            Open the relevant queue to review the next action.
          </p>
        </CardHeader>
        <CardContent className="grid divide-y p-0 sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-y-0">
          {[
            {
              kind: "rides",
              status: 1,
              label: "Searching for a traveler",
              icon: Search,
              tone: "text-blue-600 bg-blue-50",
            },
            {
              kind: "rides",
              status: 3,
              label: "Payment pending",
              icon: CreditCard,
              tone: "text-amber-600 bg-amber-50",
            },
            {
              kind: "rides",
              status: 14,
              label: "Disputed rides",
              icon: TriangleAlert,
              tone: "text-rose-600 bg-rose-50",
            },
            {
              kind: "trips",
              status: 12,
              label: "Flagged trips",
              icon: ShieldAlert,
              tone: "text-violet-600 bg-violet-50",
            },
          ].map((item) => (
            <Link
              key={item.label}
              aria-label={`View ${item.label}`}
              to={journeyLink(item.kind, item.status)}
              className="flex items-center gap-3 p-5 transition-colors hover:bg-muted/40"
            >
              <span className={`rounded-xl p-2.5 ${item.tone}`}>
                <item.icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium">{item.label}</h3>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {number(
                    count(item.kind === "trips" ? trips : rides, item.status),
                  )}
                </p>
              </div>
              <ArrowUpRight size={16} className="text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        {(["trips", "rides"] as const).map((kind) => (
          <StatusChart
            key={kind}
            kind={kind}
            buckets={kind === "trips" ? trips : rides}
            journeyLink={journeyLink}
          />
        ))}
      </div>
    </div>
  );
}
function StatusChart({
  kind,
  buckets,
  journeyLink,
}: {
  kind: string;
  buckets: OverviewBucket[];
  journeyLink: Props["journeyLink"];
}) {
  const total = sum(buckets);
  const data = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      ...b,
      name:
        b.label === "UNKNOWN" ? `Unknown status (${b.status})` : label(b.label),
      fill: /expired|cancel/i.test(b.label)
        ? "#64748b"
        : /disput|flag|fail/i.test(b.label)
          ? "#e11d48"
          : /complet/i.test(b.label)
            ? "#059669"
            : /pending/i.test(b.label)
              ? "#d97706"
              : colors[b.status % colors.length],
    }));
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="border-b p-5">
        <h2 className="text-lg font-semibold">
          {kind === "trips" ? "Trip status breakdown" : "Ride status breakdown"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Current status within the scheduled-date filters above.
        </p>
      </CardHeader>
      <CardContent className="p-5">
        {total > 0 ? (
          <>
            <div className="relative mx-auto h-52 max-w-72">
              <ChartContainer
                config={{ count: { label: "Records" } }}
                className="h-full w-full"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="name" hideLabel />}
                  />
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={64}
                    outerRadius={88}
                    strokeWidth={3}
                    isAnimationActive={false}
                  />
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tabular-nums">
                  {number(total)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Total {kind}
                </span>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {data.map((b) => (
                <li key={b.status}>
                  {b.label === "UNKNOWN" ? (
                    <p className="flex justify-between p-2 text-sm">
                      <span>{b.name}</span>
                      <strong>{number(b.count)}</strong>
                    </p>
                  ) : (
                    <Link
                      to={journeyLink(kind, b.status)}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-muted"
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: b.fill }}
                      />
                      <span className="flex-1">{b.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round((b.count / total) * 100)}%
                      </span>
                      <strong className="min-w-8 text-right tabular-nums">
                        {number(b.count)}
                      </strong>
                      <ArrowUpRight size={13} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <ChartNoAxesCombined size={30} />
            <p className="text-sm">No {kind} recorded.</p>
            <p className="text-xs">Try another date range or region.</p>
          </div>
        )}
        <Link
          to={journeyLink(kind)}
          className="mt-4 flex items-center justify-between border-t pt-4 text-sm font-medium text-emerald-700"
        >
          View all {kind}
          <ArrowUpRight size={16} />
        </Link>
      </CardContent>
    </Card>
  );
}
type Trend = {
  daily: { date: string; trips: number; rides: number }[];
  generated_at: string;
};
export function CreationTrend({
  state,
  version,
}: {
  state: string;
  version: number;
}) {
  const [range] = useStateRange();
  const query = new URLSearchParams({ ...range, ...(state ? { state } : {}) });
  const result = useRead<Trend>(`/reports/journeys?${query}`, version);
  const data = result?.data?.daily ?? [];
  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-b p-5 sm:flex-row">
        <div>
          <h2 className="text-lg font-semibold">New journey activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Last 30 days · created date in IST · selected region
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-emerald-600" />
            Trips
          </span>
          <span className="flex items-center gap-2">
            <i className="size-2 rounded-full bg-blue-500" />
            Rides
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {!result ? (
          <p role="status" className="py-20 text-center text-muted-foreground">
            Loading activity chart…
          </p>
        ) : result.error ? (
          <p
            role="alert"
            className="rounded-lg bg-amber-50 p-5 text-sm text-amber-900"
          >
            Activity chart unavailable. {result.error}
          </p>
        ) : data.some((d) => d.trips || d.rides) ? (
          <>
            <ChartContainer
              config={{
                trips: { label: "Trips", color: "#059669" },
                rides: { label: "Rides", color: "#3b82f6" },
              }}
              className="h-64 w-full"
            >
              <AreaChart
                accessibilityLayer
                data={data}
                margin={{ top: 12, right: 12, bottom: 0, left: -20 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                  tickFormatter={(s) => `${s.slice(8)}/${s.slice(5, 7)}`}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="linear"
                  dataKey="trips"
                  stroke="var(--color-trips)"
                  fill="var(--color-trips)"
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area
                  type="linear"
                  dataKey="rides"
                  stroke="var(--color-rides)"
                  fill="var(--color-rides)"
                  fillOpacity={0.08}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ChartContainer>
            <details className="mt-3 text-xs text-muted-foreground">
              <summary className="cursor-pointer">View daily counts</summary>
              <table className="mt-3 w-full text-left">
                <caption className="sr-only">
                  Daily created journeys in IST
                </caption>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Trips</th>
                    <th>Rides</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{number(d.trips)}</td>
                      <td>{number(d.rides)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        ) : (
          <p className="py-20 text-center text-sm text-muted-foreground">
            No journeys created in this period.
          </p>
        )}
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
          {range.from} – {range.to}. This chart uses creation dates; the cards
          and status charts use the scheduled-date filters.
        </p>
      </CardContent>
    </Card>
  );
}
function useStateRange() {
  return useState(() => {
    const to = new Date(Date.now() + 19800000).toISOString().slice(0, 10);
    return {
      from: new Date(Date.parse(to) - 29 * 86400000).toISOString().slice(0, 10),
      to,
    };
  });
}
