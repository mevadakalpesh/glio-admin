import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRead } from "./useRead";
type Usage = {
  record: { id: number; label: string; is_active: boolean };
  groups: {
    key: string;
    title: string;
    total: number;
    statuses: { status: number; label: string; count: number }[];
  }[];
  generated_at: string;
  scope: string;
};
export function CatalogUsage({
  kind,
  id,
  onClose,
}: {
  kind: "vehicles" | "luggage";
  id: number;
  onClose: () => void;
}) {
  const [version, setVersion] = useState(0);
  const result = useRead<Usage>(`/catalog/${kind}/${id}/usage`, version);
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Catalog usage{result?.data ? ` · ${result.data.record.label}` : ""}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
              Refresh usage
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Close usage
            </Button>
          </div>
        </div>
        <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {kind === "luggage"
            ? "Owners can change luggage availability through Edit and its confirmation preview. Existing requests and bookings keep their recorded selections."
            : "Vehicle activation remains unavailable while shared-catalog safeguards are completed."}{" "}
          These counts describe stored references, not approval to change
          availability.
        </p>
        {!result && <p role="status">Loading usage…</p>}
        {result?.error && (
          <p role="alert" className="text-red-800">
            {result.error}
          </p>
        )}
        {result?.data && (
          <>
            <p className="text-xs text-slate-500">
              Snapshot:{" "}
              {new Intl.DateTimeFormat("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(result.data.generated_at))}{" "}
              IST
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {result.data.groups.map((group) => (
                <section key={group.key} className="rounded-xl border p-4">
                  <h3 className="font-medium">{group.title}</h3>
                  <p className="my-3 text-2xl font-semibold">
                    {group.total}{" "}
                    <span className="text-sm font-normal text-slate-500">
                      stored records
                    </span>
                  </p>
                  {group.statuses.length ? (
                    <dl className="space-y-2">
                      {group.statuses.map((row) => (
                        <div
                          key={String(row.status)}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <dt className="text-slate-600">
                            {row.label === "UNKNOWN"
                              ? `Unknown status (${row.status ?? "not recorded"})`
                              : row.label.replaceAll("_", " ").toLowerCase()}
                          </dt>
                          <dd className="font-medium">{row.count}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No stored references in this group.
                    </p>
                  )}
                </section>
              ))}
            </div>
            <p className="text-sm text-slate-600">{result.data.scope}</p>
            <p className="text-xs leading-5 text-slate-500">
              {kind === "vehicles"
                ? "Trip counts include rides-only and combined trips, excluding package-only trips. Ride counts reflect an explicit vehicle preference; “Any vehicle” requests are not included."
                : "Requests and bookings can refer to the same journey and are shown separately."}{" "}
              These are all-date recorded statuses, not a live passenger or
              booking count.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
