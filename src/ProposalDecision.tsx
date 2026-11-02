import {Textarea} from '@/components/ui/textarea';
import { RemainderAllocation, type RemainderAmounts } from "./RemainderAllocation";
import { useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Props = {
  caseId: string;
  proposalId: string;
  revision: string;
  financial?: { allocation?: RemainderAmounts; amount_paise: number; revision: string; remaining_held_paise?: number };
  canApprove: boolean;
  canReject: boolean;
  onSaved: () => void;
};
export function ProposalDecision({
  caseId,
  proposalId,
  revision,
  financial,
  canApprove,
  canReject,
  onSaved,
}: Props) {
  const { session } = useAuth();
  const [choice, setChoice] = useState<"approve" | "reject" | null>(null),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    decision: "approve" | "reject";
    reason: string;
    revision: string;
    financial_revision?: string;
  } | null>(null);
  const saving = useRef(false);
  if (
    !session?.staff.permissions.includes("cases.proposals.decide") ||
    (financial &&
      !session.staff.permissions.includes("cases.wallet-refund.decide")) ||
    (!canApprove && !canReject)
  )
    return null;
  async function save() {
    if (!pending || !session || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await api(
        `/ride-cases/${encodeURIComponent(caseId)}/proposals/${encodeURIComponent(proposalId)}/decision`,
        { method: "POST", csrf: session.csrf_token, body: pending },
      );
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The decision could not be confirmed. Retry or refresh proposals.",
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
      {!choice ? (
        <div className="flex flex-wrap gap-3">
          {canApprove && (
            <Button onClick={() => setChoice("approve")}>
              Review approval
            </Button>
          )}
          {canReject && (
            <Button variant="outline" onClick={() => setChoice("reject")}>
              Review rejection
            </Button>
          )}
        </div>
      ) : pending ? (
        <>
          <p className="font-medium">
            {pending.decision === "approve"
              ? "Approve this recommendation?"
              : "Reject this recommendation?"}
          </p>
          {financial?.remaining_held_paise!==undefined&&<p>Remaining held after refund: {new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(financial.remaining_held_paise/100)}. This requires a separate settlement decision.</p>}
          {financial?.allocation && <RemainderAllocation value={financial.allocation} />}
          {financial && (
            <p className="font-semibold">
              {financial.allocation ? "Remaining balance:" : financial.remaining_held_paise!==undefined ? "Partial wallet refund:" : "Full wallet refund:"}{" "}
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(financial.amount_paise / 100)}
            </p>
          )}
          <p className="whitespace-pre-wrap break-words text-sm">
            Reason: {pending.reason}
          </p>
          <p className="text-sm text-slate-600">
            This records a review decision only. It does not close the case,
            change the ride or move money.
          </p>
          <Button disabled={busy} onClick={() => void save()}>
            {busy
              ? "Saving…"
              : pending.decision === "approve"
                ? "Confirm approval"
                : "Confirm rejection"}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Edit decision
          </Button>
        </>
      ) : (
        <>
          <label className="block text-sm">
            Decision reason
            <Textarea
              className="mt-2 block w-full rounded border p-2"
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button
            disabled={reason.trim().length < 10}
            onClick={() =>
              setPending({
                id: crypto.randomUUID(),
                decision: choice,
                reason: reason.trim(),
                revision,
                ...(financial
                  ? { financial_revision: financial.revision }
                  : {}),
              })
            }
          >
            Review decision
          </Button>
        </>
      )}
      {choice && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setChoice(null);
            setPending(null);
            setReason("");
            setError("");
          }}
        >
          Cancel decision
        </Button>
      )}
    </div>
  );
}
