import { RemainderAllocation, type RemainderAmounts } from "./RemainderAllocation";
import { useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
export function RefundProposalSubmit({
  caseId,
  token,
  amount,
  reason,
  expired,
  onSaved,
  partial = false,
  remaining,
  allocation,
}: {
  caseId: string;
  partial?: boolean;
  allocation?: RemainderAmounts;
  remaining?: number;
  token: string;
  amount: number;
  reason: string;
  expired?: boolean;
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState<{
    id: string;
    preview_token: string;
  } | null>(null);
  const saving = useRef(false);
  if (!session?.staff.permissions.includes("cases.wallet-refund.propose"))
    return null;
  async function submit() {
    if (!session || saving.current || (expired && !attempt)) return;
    saving.current = true;
    setBusy(true);
    setError("");
    const payload = attempt ?? {
      id: crypto.randomUUID(),
      preview_token: token,
    };
    setAttempt(payload);
    try {
      await api(
        `/ride-cases/${encodeURIComponent(caseId)}/${allocation?"remainder-proposals":partial?"partial-refund-proposals":"wallet-refund-proposals"}`,
        { method: "POST", csrf: session.csrf_token, body: payload },
      );
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Submission could not be confirmed. Retry or review proposal history.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3 border-t pt-3">
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {!confirm ? (
        <Button disabled={expired} onClick={() => setConfirm(true)}>
          {allocation ? "Review remainder proposal" : "Review refund proposal"}
        </Button>
      ) : (
        <>
          <p className="font-medium">
            {allocation?"Submit remaining-balance decision for":partial?"Submit partial refund of":"Submit full refund of"}{" "}
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(amount / 100)}{" "}
            for independent review?
          </p>
          {allocation && <RemainderAllocation value={allocation} />}
          {partial&&<p>Remaining held: {typeof remaining==='number'?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(remaining/100):"Unavailable"}. Separate settlement approval is required.</p>}
          <p className="text-sm">Reason: {reason}</p>
          <p className="text-sm text-slate-600">
            {allocation?"Confirm the proposed allocation is supported by the case evidence.":partial?"Confirm the partial refund and remaining hold are supported by the case evidence.":"Confirm that the case evidence justifies a full refund without deductions."} A different authorized reviewer must decide. No money
            moves on submission or approval.
          </p>
          <Button
            disabled={busy || (!!expired && !attempt)}
            onClick={() => void submit()}
          >
            {busy
              ? "Submitting…"
              : attempt
                ? "Retry same submission"
                : allocation ? "Submit remainder proposal" : "Submit refund proposal"}
          </Button>
          {!attempt && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel proposal
            </Button>
          )}
        </>
      )}
    </div>
  );
}
