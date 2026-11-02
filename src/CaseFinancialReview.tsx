import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  items: { label: string; value: string; type: string }[];
  page: number;
  page_size: number;
  total: number;
  viewed_at: string;
};
const date = (value: string) =>
  Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Not recorded";
export function CaseFinancialReview({ id }: { id: string }) {
  const { session } = useAuth();
  const [reason, setReason] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  if (!session?.staff.permissions.includes("cases.financial-review.read"))
    return null;
  function hide() {
    pending.current?.abort();
    pending.current = null;
    setResult(null);
    setReason("");
    setError("");
    setBusy(false);
  }
  async function read(page = 1) {
    if (pending.current || !session) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await api<Result>(
        `/ride-cases/${encodeURIComponent(id)}/financial-review`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: { reason: reason.trim(), page },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) setResult(data);
    } catch (e) {
      if (pending.current === controller)
        setError(
          e instanceof Error ? e.message : "Financial review is unavailable.",
        );
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Financial review</h2>
      <p className="text-sm text-slate-600">
        Audited access to recorded ride payment information. This does not check
        the provider live, show wallet balances, calculate a refundable amount
        or move money. Review each payment attempt separately.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {!result && !busy && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void read();
          }}
        >
          <label className="block text-sm">
            Financial review reason
            <Input
              required
              minLength={5}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 block w-full rounded border p-2"
            />
          </label>
          <Button type="submit" disabled={reason.trim().length < 5}>
            View financial review
          </Button>
        </form>
      )}
      {busy && <p role="status">Loading financial review…</p>}
      {(result || busy) && (
        <Button variant="outline" onClick={hide}>
          {busy ? "Cancel financial review" : "Hide financial review"}
        </Button>
      )}
      {result && (
        <>
          <p className="text-sm text-slate-600">
            Snapshot accessed {date(result.viewed_at)} · {result.total} recorded
            provider payment attempts
          </p>
          {!result.total && (
            <p>
              No provider payment attempts recorded. This alone does not
              establish whether the ride was paid.
            </p>
          )}
          <dl className="divide-y">
            {result.items.map((item, index) => (
              <div key={index} className="grid gap-1 py-3 sm:grid-cols-2">
                <dt className="text-sm text-slate-600">{item.label}</dt>
                <dd className="break-words text-sm font-medium">
                  {item.type === "time" ? date(item.value) : item.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={result.page <= 1}
              onClick={() => void read(result.page - 1)}
            >
              Previous payment records
            </Button>
            <span>Page {result.page}</span>
            <Button
              variant="outline"
              disabled={result.page * result.page_size >= result.total}
              onClick={() => void read(result.page + 1)}
            >
              Next payment records
            </Button>
            <Button variant="outline" onClick={() => void read(1)}>
              Refresh financial review
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
