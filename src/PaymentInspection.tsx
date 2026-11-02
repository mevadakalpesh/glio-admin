import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  amount_evidence?: { status: string; notes: string[] };
  refund_timeline?: {
    status: string;
    elapsed_seconds: number | null;
    notes: string[];
  };
  refund_requested_at?: string | null;
  refund_completed_at?: string | null;
  check_evidence?: {
    error_recorded: boolean;
    explanation: string;
    timestamp_status: string;
    age_seconds: number | null;
    notes: string[];
  };
  local_consistency?: { status: string; notes: string[] };
  state: string;
  environment: string;
  settlement_mode: string;
  refund_status: string;
  settlement_status: string;
  amount: string | null;
  platform_fee: string | null;
  traveler_payout: string | null;
  refund_amount: string | null;
  created_at: string | null;
  updated_at: string | null;
  paid_at: string | null;
  checked_at: string | null;
  expires_at: string | null;
  notes: string[];
};
export function PaymentInspection({ id }: { id: string }) {
  const { session } = useAuth();
  const [result, setResult] = useState<Result | null>(null),
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
  if (!session?.staff.permissions.includes("payments.inspect")) return null;
  function hide() {
    pending.current?.abort();
    pending.current = null;
    setResult(null);
    setError("");
    setBusy(false);
  }
  async function reveal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session) return;
    const reason = String(
      new FormData(event.currentTarget).get("reason") || "",
    ).trim();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await api<Result>(
        `/payments/${encodeURIComponent(id)}/inspection`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: { reason },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) setResult(data);
    } catch (e) {
      if (pending.current === controller)
        setError(e instanceof Error ? e.message : "Could not inspect payment.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Payment record inspection</h2>
      <p className="text-sm text-slate-600">
        Access is audited. These are stored payment records, not a live provider
        check. Checkout credentials and raw errors are withheld.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result ? (
        <>
          <p className="font-semibold">
            {result.environment === "SANDBOX"
              ? "Test payment"
              : result.environment === "PRODUCTION"
                ? "Production payment"
                : "Unknown environment"}
          </p>
          <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            {[
              ["Payment state", result.state],
              ["Refund state", result.refund_status],
              ["Settlement state", result.settlement_status],
              ["Settlement mode", result.settlement_mode],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold">{value.replaceAll("_", " ")}</dd>
              </div>
            ))}
            {[
              ["Order amount", result.amount],
              ["Recorded platform fee", result.platform_fee],
              ["Recorded traveler allocation", result.traveler_payout],
              ["Recorded refund amount", result.refund_amount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-semibold">
                  {value == null ? "Unavailable" : `₹${value}`}
                </dd>
              </div>
            ))}
          </dl>
          {result.amount_evidence && (
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold">Stored amount checks</h3>
              <p className="mt-2 text-sm">
                {result.amount_evidence.status === "balanced"
                  ? "Compared amounts balance"
                  : result.amount_evidence.status === "incomplete"
                    ? "Incomplete amount evidence"
                    : "Amount review required"}
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                {result.amount_evidence.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
          {result.refund_timeline && (
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold">Refund timeline evidence</h3>
              <p className="mt-2 text-sm">
                {(
                  {
                    review_required: "Review required",
                    not_recorded: "No timeline recorded",
                    not_applicable: "No transfer applicable",
                    incomplete: "Incomplete evidence",
                    open: "No completion timestamp recorded",
                    completion_recorded: "Completion recorded",
                  } as Record<string, string>
                )[result.refund_timeline.status] ||
                  "Unrecognized timeline state"}
              </p>
              {result.refund_timeline.elapsed_seconds !== null && (
                <p className="mt-2 text-sm">
                  Recorded elapsed time:{" "}
                  {Math.floor(result.refund_timeline.elapsed_seconds / 60)} min
                </p>
              )}
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                {result.refund_timeline.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
          {result.check_evidence && (
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold">Recorded check evidence</h3>
              <p className="mt-2 text-sm">
                {result.check_evidence.explanation}
              </p>
              <p className="mt-2 text-sm">
                {result.check_evidence.age_seconds !== null
                  ? `Check age at inspection: ${Math.floor(result.check_evidence.age_seconds / 60)} min`
                  : result.check_evidence.timestamp_status === "future"
                    ? "Recorded check time is in the future; review clock consistency."
                    : result.check_evidence.timestamp_status === "invalid"
                      ? "Recorded check time is invalid."
                      : "Check time not recorded."}
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                {result.check_evidence.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
          {result.local_consistency && (
            <section className="rounded-xl border p-4">
              <h3 className="font-semibold">Local order and ride comparison</h3>
              <p className="mt-2 font-medium">
                {(
                  {
                    review_required: "Review required",
                    different_order: "Different current order",
                    unavailable: "Comparison unavailable",
                    incomplete: "Incomplete evidence",
                    no_difference_found:
                      "No differences found in compared fields",
                  } as Record<string, string>
                )[result.local_consistency.status] ||
                  "Unrecognized comparison result"}
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm">
                {result.local_consistency.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Refund completion time is when Gilo recorded success, not a bank
            credit timestamp. Older refund timestamps may be unavailable.
          </p>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Created", result.created_at],
              ["Refund requested", result.refund_requested_at],
              ["Refund completion recorded", result.refund_completed_at],
              ["Updated", result.updated_at],
              ["Paid", result.paid_at],
              ["Last recorded check", result.checked_at],
              ["Checkout expires", result.expires_at],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label} (IST)</dt>
                <dd>
                  {value
                    ? new Date(value).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>
          <Button variant="outline" onClick={hide}>
            Hide payment details
          </Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={reveal}>
          <label className="block text-sm">
            Reason for access
            <Input
              className="mt-2 block w-full rounded-lg border p-2"
              name="reason"
              minLength={5}
              maxLength={500}
              required
              disabled={busy}
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Opening…" : "Inspect payment record"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={hide}>
                Cancel access
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
