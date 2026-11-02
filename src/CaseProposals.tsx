import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {Input} from '@/components/ui/input';
import { RemainderAllocation, type RemainderAmounts } from "./RemainderAllocation";
import { ProposalExecution } from "./ProposalExecution";
import { ProposalDecision } from "./ProposalDecision";
import { useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
import { api } from "./api";
import { Button } from "@/components/ui/button";
const choices = {
  further_investigation: "Further investigation",
  payment_review: "Payment review",
  close_without_adjustment: "Close without financial adjustment",
};
type Item = {
  id: string;
  recommendation: string;
  rationale: string;
  status: string;
  created_at: string;
  financial?: {
    allocation?: RemainderAmounts; amount_paise: number;
    remaining_held_paise?: number;
    currency: string;
    revision: string;
  } | null;
  financial_changed?: boolean;
  by_you: boolean;
  context_changed: boolean;
  can_withdraw: boolean;
  can_execute?: boolean;
  can_close?: boolean;
  can_execute_refund?: boolean;
  execution?: { at: string; reason: string; by_you: boolean } | null;
  can_approve?: boolean;
  can_reject?: boolean;
  decision?: { reason: string; at: string; by_you: boolean } | null;
};
type Result = {
  items: Item[];
  revision: string;
  can_propose: boolean;
  page: number;
  page_size: number;
  total: number;
};
export function CaseProposals({
  id,
  onExecuted,
}: {
  id: string;
  onExecuted?: (message?: string) => void;
}) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  if (!session?.staff.permissions.includes("cases.proposals.read")) return null;
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Resolution proposals</h2>
      <p className="text-sm text-slate-600">
        Proposals require a different authorized reviewer to approve or reject
        them. Approved further investigation can be applied separately. Payment
        review execution remains unavailable. Case closure is limited to eligible ended rides with no payment evidence
        or verified wallet refunds or remainder settlement. Approved wallet refunds can be
        applied separately after fresh checks.
      </p>
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide proposals" : "View proposals"}
      </Button>
      {open && <ProposalPanel id={id} onExecuted={onExecuted} />}
    </section>
  );
}
function ProposalPanel({
  id,
  onExecuted,
}: {
  id: string;
  onExecuted?: (message?: string) => void;
}) {
  const { session } = useAuth();
  const allowed = session?.staff.permissions.includes("cases.proposals.write");
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [recommendation, setRecommendation] = useState("further_investigation"),
    [rationale, setRationale] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
    id: string;
    recommendation: string;
    rationale: string;
    revision: string;
  } | null>(null);
  const [withdraw, setWithdraw] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const saving = useRef(false);
  const result = useRead<Result>(
      `/ride-cases/${encodeURIComponent(id)}/proposals?page=${page}`,
      revision,
    ),
    data = result?.data;
  function reset() {
    setPending(null);
    setWithdraw(null);
    setConfirmWithdrawal(false);
    setReason("");
    setRevision((v) => v + 1);
  }
  async function save(isWithdrawal = false) {
    if (
      !session ||
      saving.current ||
      (!isWithdrawal && !pending) ||
      (isWithdrawal && !withdraw)
    )
      return;
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api<{ item: Item }>(
        `/ride-cases/${encodeURIComponent(id)}/proposals${isWithdrawal ? `/${withdraw}/withdraw` : ""}`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: isWithdrawal ? { reason: reason.trim() } : pending,
        },
      );
      setMessage(
        isWithdrawal
          ? "Proposal withdrawn."
          : response.item.status === "pending_review"
            ? "Proposal recorded. It has not been approved or applied."
            : "This submission was already recorded; its current status is " +
              response.item.status.replaceAll("_", " ") +
              ".",
      );
      setRationale("");
      reset();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The result could not be confirmed. Retry this submission or refresh proposals.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          setPage(1);
          setError("");
          setMessage("");
          reset();
        }}
      >
        Refresh proposals
      </Button>
      {!result && <p role="status">Loading proposals…</p>}
      {(error || result?.error) && (
        <p role="alert" className="text-red-800">
          {error || result?.error}
        </p>
      )}
      {message && (
        <p role="status" className="text-emerald-800">
          {message}
        </p>
      )}
      {data && (
        <>
          {data.items.length ? (
            <ol className="space-y-3">
              {data.items.map((item) => (
                <li className="space-y-2 rounded-lg border p-3" key={item.id}>
                  <p className="font-semibold">
                    {choices[item.recommendation as keyof typeof choices] ||
                      (item.recommendation === "wallet_full_refund"
                        ? "Full wallet refund"
                        : item.recommendation === "wallet_partial_refund" ? "Partial wallet refund" : item.recommendation.startsWith("remainder_") ? "Remaining-balance decision" : "Recorded recommendation")}{" "}
                    ·{" "}
                    {item.status === "approved"
                      ? "Approved · Not applied"
                      : item.status.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-slate-600">
                    {item.by_you
                      ? "Proposed by you"
                      : "Proposed by another reviewer"}{" "}
                    ·{" "}
                    {item.created_at &&
                    Number.isFinite(Date.parse(item.created_at))
                      ? new Date(item.created_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "medium",
                          timeStyle: "short",
                        }) + " IST"
                      : "Time not recorded"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {item.rationale}
                  </p>
                  {item.financial && (
                    <div className="rounded bg-amber-50 p-3 text-sm">
                      <p className="font-semibold">
                        {item.financial.allocation?"Remaining balance:":item.recommendation==='wallet_partial_refund'?"Partial wallet refund:":"Full wallet refund:"}{" "}
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(item.financial.amount_paise / 100)}
                      </p>
                      <p>
                        {item.financial.allocation?"Review the proposed allocation below.":item.recommendation==='wallet_partial_refund'?"Remaining funds stay held for a separate decision.":"No deductions."} Review whether the case evidence
                        justifies this amount. Approval does not move money.
                      </p>
                      {item.financial.remaining_held_paise!==undefined&&<p>Remaining held: {new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(item.financial.remaining_held_paise/100)}. The remainder requires a separate decision.</p>}
                      {item.financial.allocation && <RemainderAllocation value={item.financial.allocation} />}
                      {item.financial_changed && (
                        <p className="text-amber-900">
                          Financial evidence changed or is unavailable. This
                          proposal cannot be approved; reject or withdraw it and
                          prepare a new preview.
                        </p>
                      )}
                    </div>
                  )}
                  {item.decision && (
                    <div className="rounded bg-slate-50 p-3 text-sm">
                      <p className="font-medium">
                        Decision recorded{" "}
                        {item.decision.by_you
                          ? "by you"
                          : "by another reviewer"}
                      </p>
                      <p>
                        {Number.isFinite(Date.parse(item.decision.at))
                          ? new Date(item.decision.at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                            }) + " IST"
                          : "Time not recorded"}
                      </p>
                      <p className="whitespace-pre-wrap break-words">
                        {item.decision.reason}
                      </p>
                    </div>
                  )}
                  {!withdraw && !pending && (
                    <ProposalDecision
                      key={`${item.id}:${revision}`}
                      caseId={id}
                      proposalId={item.id}
                      revision={data.revision}
                      financial={item.financial || undefined}
                      canApprove={!!item.can_approve}
                      canReject={!!item.can_reject}
                      onSaved={() => {
                        setMessage(
                          "Review decision recorded. No case, ride or payment outcome was changed.",
                        );
                        reset();
                      }}
                    />
                  )}
                  {item.execution && (
                    <div className="rounded bg-emerald-50 p-3 text-sm">
                      <p className="font-medium">
                        {item.recommendation === "close_without_adjustment"
                          ? "Case resolved"
                          : item.financial
                            ? item.financial?.allocation ? "Remainder decision applied" : "Wallet refund applied"
                            : "Further investigation applied"}{" "}
                        {item.execution.by_you
                          ? "by you"
                          : "by another reviewer"}
                      </p>
                      <p>
                        {Number.isFinite(Date.parse(item.execution.at))
                          ? new Date(item.execution.at).toLocaleString(
                              "en-IN",
                              {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "medium",
                                timeStyle: "short",
                              },
                            ) + " IST"
                          : "Time not recorded"}
                      </p>
                      <p className="whitespace-pre-wrap break-words">
                        {item.execution.reason}
                      </p>
                    </div>
                  )}
                  {(item.can_execute ||
                    item.can_execute_refund ||
                    item.can_close) &&
                    !withdraw &&
                    !pending && (
                      <ProposalExecution
                        closing={
                          item.recommendation === "close_without_adjustment"
                        }
                        financial={item.financial || undefined}
                        key={`execute:${item.id}:${revision}`}
                        caseId={id}
                        proposalId={item.id}
                        revision={data.revision}
                        onSaved={() => {
                          setMessage(
                            item.can_close
                              ? "Case closure recorded."
                              : item.financial
                                ? "Financial execution recorded."
                                : "Further investigation execution recorded.",
                          );
                          reset();
                          onExecuted?.(
                            item.can_close
                              ? "Case closure recorded. Current case details have been refreshed."
                              : item.financial
                                ? "Financial execution recorded. Current case details have been refreshed."
                                : undefined,
                          );
                        }}
                      />
                    )}
                  {item.context_changed && (
                    <p className="text-sm text-amber-800">
                      Case or assignment changed since this proposal. Review the
                      current facts before any decision.
                    </p>
                  )}
                  {allowed && item.can_withdraw && !withdraw && (
                    <Button
                      variant="outline"
                      disabled={busy || !!pending}
                      onClick={() => {
                        setWithdraw(item.id);
                        setReason("");
                        setConfirmWithdrawal(false);
                      }}
                    >
                      Withdraw proposal
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No proposals recorded.</p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={busy || page <= 1 || !!pending || !!withdraw}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous proposals
            </Button>
            <span>Page {data.page}</span>
            <Button
              variant="outline"
              disabled={
                busy ||
                page * data.page_size >= data.total ||
                !!pending ||
                !!withdraw
              }
              onClick={() => setPage((v) => v + 1)}
            >
              Next proposals
            </Button>
          </div>
          {withdraw && (
            <div className="space-y-3 rounded border p-3">
              {confirmWithdrawal ? (
                <>
                  <p>
                    Withdraw this proposal and any recorded approval? The case
                    and any payment hold will remain unchanged.
                  </p>
                  <p className="break-words text-sm">Reason: {reason}</p>
                  <Button disabled={busy} onClick={() => void save(true)}>
                    Confirm withdrawal
                  </Button>
                </>
              ) : (
                <>
                  <label className="block text-sm">
                    Withdrawal reason
                    <Input
                      className="mt-2 block w-full rounded border p-2"
                      value={reason}
                      maxLength={500}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <Button
                    disabled={reason.trim().length < 5}
                    onClick={() => setConfirmWithdrawal(true)}
                  >
                    Review withdrawal
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setWithdraw(null);
                  setConfirmWithdrawal(false);
                }}
              >
                Cancel withdrawal
              </Button>
            </div>
          )}
          {allowed &&
            data.can_propose &&
            !withdraw &&
            (pending ? (
              <div className="space-y-3 rounded border p-3">
                <p className="font-semibold">
                  Review proposal:{" "}
                  {choices[pending.recommendation as keyof typeof choices]}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {pending.rationale}
                </p>
                <p className="text-sm">
                  Save this recommendation for review? This does not approve or
                  apply it.
                </p>
                <Button disabled={busy} onClick={() => void save()}>
                  {busy ? "Saving…" : "Submit proposal"}
                </Button>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPending(null)}
                >
                  Edit proposal
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm">
                  Recommendation
                  <NativeSelect
                    className="mt-2 block w-full rounded border p-2"
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                  >
                    {Object.entries(choices).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <label className="block text-sm">
                  Rationale
                  <Textarea
                    className="mt-2 block w-full rounded border p-2"
                    value={rationale}
                    maxLength={2000}
                    onChange={(e) => setRationale(e.target.value)}
                  />
                </label>
                <p className="text-sm text-slate-600">
                  Explain the evidence and reasoning in 20–2000 characters. Do
                  not include OTPs, card details or document numbers.
                </p>
                <Button
                  disabled={rationale.trim().length < 20 || busy}
                  onClick={() => {
                    setError("");
                    setPending({
                      id: crypto.randomUUID(),
                      recommendation,
                      rationale: rationale.trim(),
                      revision: data.revision,
                    });
                  }}
                >
                  Review proposal
                </Button>
              </div>
            ))}
          {allowed && !data.can_propose && (
            <p className="text-sm text-slate-600">
              A new proposal requires an open or waiting case assigned to you,
              with no proposal awaiting review or approved but not applied.
            </p>
          )}
        </>
      )}
    </div>
  );
}
