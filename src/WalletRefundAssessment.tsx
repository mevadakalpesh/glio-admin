import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  checks_passed: boolean;
  blockers: string[];
  illustrative_full_refund_paise?: number | null;
  allocation?: {original_total_paise:number; already_refunded_paise:number; remaining_held_paise:number; rider_refund_paise:number; traveler_payout_paise:number; platform_fee_paise:number} | null;
  execution_available: false;
  assessed_at: string;
};
export function WalletRefundAssessment({ id, remainder=false }: { id: string; remainder?: boolean }) {
  const { session } = useAuth();
  const [outcome, setOutcome] = useState("refund_rider");
  const [reason, setReason] = useState(""),
    [result, setResult] = useState<Result | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  if (!session?.staff.permissions.includes("cases.wallet-refund.assess"))
    return null;
  function hide() {
    pending.current?.abort();
    pending.current = null;
    setResult(null);
    setError("");
    setReason("");
    setBusy(false);
  }
  async function assess() {
    if (pending.current || !session) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setResult(null);
    setError("");
    try {
      const data = await api<Result>(
        `/ride-cases/${encodeURIComponent(id)}/${remainder ? "remainder-assessment" : "wallet-refund-assessment"}`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: { reason: reason.trim(), ...(remainder ? {outcome} : {}) },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) setResult(data);
    } catch (e) {
      if (pending.current === controller)
        setError(e instanceof Error ? e.message : "Assessment unavailable.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">{remainder ? "Remaining balance assessment" : "Wallet refund assessment"}</h2>
      <p className="text-sm text-slate-600">
        {remainder ? "Review funds left after an approved partial wallet refund. Choose an outcome to assess the amounts. This does not approve settlement or move money." : "For cancelled or no-show wallet rides only. This checks recorded escrow, held funds and the booking debit. It does not decide refund entitlement, approve a refund or move money."}
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
            void assess();
          }}
        >
          {remainder && <label className="block text-sm">Proposed outcome
            <NativeSelect className="mt-2 block w-full rounded border p-2" value={outcome} onChange={e=>setOutcome(e.target.value)}>
              <option value="refund_rider">Refund remainder to rider</option>
              <option value="settle_traveler">Settle remainder with traveler</option>
            </NativeSelect>
          </label>}
          <label className="block text-sm">
            Assessment reason
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
            {remainder ? "Assess remaining balance" : "Assess wallet refund"}
          </Button>
        </form>
      )}
      {busy && <p role="status">Checking recorded wallet evidence…</p>}
      {(busy || result) && (
        <Button variant="outline" onClick={hide}>
          {busy ? "Cancel assessment" : "Hide assessment"}
        </Button>
      )}
      {result && (
        <div className="space-y-3">
          <p className="font-semibold">
            {result.checks_passed
              ? "Snapshot checks passed · Not approved"
              : "Reconciliation or outcome review required"}
          </p>
          {result.blockers.length > 0 && (
            <ul className="list-disc space-y-2 pl-5 text-sm">
              {result.blockers.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {!remainder && result.illustrative_full_refund_paise != null && (
            <p className="text-sm">
              Illustrative full refund before any approved deductions:{" "}
              <strong>
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(result.illustrative_full_refund_paise / 100)}
              </strong>
            </p>
          )}
          {remainder && result.checks_passed && result.allocation && <dl className="grid grid-cols-2 gap-2 text-sm">
            {([
              ["Original fare",result.allocation.original_total_paise],
              ["Already refunded",result.allocation.already_refunded_paise],
              ["Remaining held",result.allocation.remaining_held_paise],
              ["Proposed rider refund",result.allocation.rider_refund_paise],
              ["Proposed traveler payout",result.allocation.traveler_payout_paise],
              ["Platform fee",result.allocation.platform_fee_paise],
            ] as const).map(([label,amount])=><div key={label}><dt className="text-slate-600">{label}</dt><dd className="font-semibold">{new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(amount/100)}</dd></div>)}
          </dl>}
          {remainder && <p className="text-sm text-slate-600">This assessment is not an approval. Prepare a separate proposal; funds remain held until its approved execution.</p>}
          <p className="text-sm text-slate-600">
            Assessed{" "}
            {new Date(result.assessed_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            IST. This snapshot can change; it cannot be used as an execution
            authorization.
          </p>
          <Button variant="outline" onClick={() => void assess()}>
            Refresh assessment
          </Button>
        </div>
      )}
    </section>
  );
}
