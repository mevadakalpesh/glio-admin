import {Textarea} from '@/components/ui/textarea';
import { RemainderAllocation, type RemainderAmounts } from "./RemainderAllocation";
import { useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
export function ProposalExecution({
  caseId,
  proposalId,
  revision,
  financial,
  closing = false,
  onSaved,
}: {
  caseId: string;
  proposalId: string;
  revision: string;
  closing?: boolean;
  financial?: { allocation?: RemainderAmounts; amount_paise: number; remaining_held_paise?: number; revision: string };
  onSaved: () => void;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState<{
    id: string;
    reason: string;
    revision: string;
    financial_revision?: string;
  } | null>(null);
  const saving = useRef(false);
  if (
    !session?.staff.permissions.includes(
      closing
        ? "cases.close"
        : financial
          ? "cases.wallet-refund.execute"
          : "cases.proposals.execute",
    )
  )
    return null;
  async function save() {
    if (!pending || !session || saving.current) return;
    saving.current = true;
    setBusy(true);
    setAttempted(true);
    setError("");
    try {
      await api(
        `/ride-cases/${encodeURIComponent(caseId)}/proposals/${encodeURIComponent(proposalId)}/${closing ? "close" : financial ? "refund" : "execute"}`,
        { method: "POST", csrf: session.csrf_token, body: pending },
      );
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Execution could not be confirmed. Retry or refresh proposals.",
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
      {!open ? (
        <Button onClick={() => setOpen(true)}>
          {closing
            ? "Review case closure"
            : financial
              ? financial.allocation ? "Apply approved remainder decision" : "Apply approved wallet refund"
              : "Apply further investigation"}
        </Button>
      ) : (
        <>
          {closing ? (
            <p className="text-sm">
              Resolve this case without an additional financial adjustment.
              Eligible cases are cancelled or expired rides with no recorded
              payment evidence, or ended wallet rides with a verified full refund
              or remainder settlement executed through this case. Active rides,
              payment attempts and unsettled money require further review.
            </p>
          ) : financial?.allocation ? (
            <div className="space-y-2"><RemainderAllocation value={financial.allocation}/><p className="text-sm">This applies the approved wallet allocation and releases the remaining hold. It does not close the case or change journey completion.</p></div>
          ) : financial ? (
            <p className="text-sm">
              Return{" "}
              <strong>
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                }).format(financial.amount_paise / 100)}
              </strong>{" "}
              to the rider’s Gilo wallet. This credits real wallet funds and
              queues a refund notification. The case remains open for any
              remaining review.
              {financial.remaining_held_paise !== undefined && <span className="mt-2 block font-medium">
                {new Intl.NumberFormat("en-IN", {style:"currency", currency:"INR"}).format(financial.remaining_held_paise / 100)} remains held for a separate decision. This action does not pay the traveler or close the case.
              </span>}
            </p>
          ) : (
            <p className="text-sm">
              The case will be marked Waiting for further investigation.
              Existing payment holds stay in place. This does not close the
              case, change the ride or send a notification.
            </p>
          )}
          {pending ? (
            <>
              <p className="break-words text-sm">Reason: {pending.reason}</p>
              <Button disabled={busy} onClick={() => void save()}>
                {busy
                  ? "Applying…"
                  : closing
                    ? attempted
                      ? "Retry same closure"
                      : "Confirm case closure"
                    : financial
                      ? attempted
                        ? financial.allocation ? "Retry same remainder decision" : "Retry same refund"
                        : financial.allocation ? "Confirm remainder decision" : "Confirm wallet refund"
                      : "Confirm investigation"}
              </Button>
              {(!(financial || closing) || !attempted) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  Edit execution reason
                </Button>
              )}
            </>
          ) : (
            <>
              <label className="block text-sm">
                Execution reason
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
                    reason: reason.trim(),
                    revision,
                    ...(financial
                      ? { financial_revision: financial.revision }
                      : {}),
                  })
                }
              >
                Review execution
              </Button>
            </>
          )}
          {(!(financial || closing) || !attempted) && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPending(null);
                setReason("");
                setError("");
              }}
            >
              Cancel execution
            </Button>
          )}
        </>
      )}
    </div>
  );
}
