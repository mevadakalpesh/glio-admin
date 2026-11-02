import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  eligible: boolean;
  basis: string | null;
  blockers: string[];
  checked_at: string;
};
export function CaseClosureReadiness({ id }: { id: string }) {
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
  if (!session?.staff.permissions.includes("cases.close")) return null;
  function hide() {
    pending.current?.abort();
    pending.current = null;
    setResult(null);
    setError("");
    setReason("");
    setBusy(false);
  }
  async function check() {
    if (!session || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const data = await api<Result>(
        `/ride-cases/${encodeURIComponent(id)}/closure-readiness`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: { reason: reason.trim() },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) setResult(data);
    } catch (e) {
      if (pending.current === controller)
        setError(e instanceof Error ? e.message : "Closure check unavailable.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Case closure readiness</h2>
      <p className="text-sm text-slate-600">
        Check the current ride and payment evidence before proposing closure.
        This does not decide the case, approve closure or move money.
        Independent approval and fresh execution checks are still required.
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
            void check();
          }}
        >
          <label className="block text-sm">
            Closure review reason
            <Input
              className="mt-2 block w-full rounded border p-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
              maxLength={500}
            />
          </label>
          <Button type="submit" disabled={reason.trim().length < 5}>
            Check closure readiness
          </Button>
        </form>
      )}
      {busy && <p role="status">Checking closure evidence…</p>}
      {result && (
        <div className="space-y-3">
          <p className="font-semibold">
            {result.eligible
              ? "Snapshot checks passed · Not approved"
              : "Further review required"}
          </p>
          {result.eligible && (
            <p className="text-sm">
              {result.basis === "no_recorded_payment"
                ? "No recorded payment evidence for this ended ride."
                : result.basis === "verified_wallet_remainder_refund"
                  ? "Partial and remainder refunds verified against the wallet ledger."
                  : result.basis === "verified_wallet_remainder_settlement"
                    ? "Partial refund and traveler remainder settlement verified against the wallet ledger."
                    : result.basis === "verified_full_wallet_refund"
                      ? "Full wallet refund and ledger evidence verified."
                      : "Closure basis unavailable. Refresh the case before proceeding."}
            </p>
          )}
          {result.blockers.length > 0 && (
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {result.blockers.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-slate-600">
            Checked{" "}
            {new Date(result.checked_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            IST. The result can change as new evidence arrives.
          </p>
          <Button variant="outline" onClick={() => void check()}>
            Refresh readiness
          </Button>
        </div>
      )}
      {(busy || result) && (
        <Button variant="outline" onClick={hide}>
          {busy ? "Cancel check" : "Hide readiness"}
        </Button>
      )}
    </section>
  );
}
