import {Input} from '@/components/ui/input';
import { RefundProposalSubmit } from "./RefundProposalSubmit";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Preview = {
  amount_paise: number;
  remaining_held_paise?: number;
  reason: string;
  preview_token: string;
  expires_at: string;
  checked_at: string;
};
export function WalletRefundPreview({
  id,
  onProposed,
  partial = false,
}: {
  id: string;
  partial?: boolean;
  onProposed?: () => void;
}) {
  const { session } = useAuth();
  const [amount,setAmount]=useState("");
  const [reason, setReason] = useState(""),
    [preview, setPreview] = useState<Preview | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(() => Date.now());
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      pending.current?.abort();
      pending.current = null;
    };
  }, []);
  if (!session?.staff.permissions.includes("cases.wallet-refund.preview"))
    return null;
  const expired = preview && Date.parse(preview.expires_at) <= now;
  function clear() {
    pending.current?.abort();
    pending.current = null;
    setPreview(null);
    setReason("");
    setAmount("");
    setError("");
    setBusy(false);
  }
  async function request(check = false) {
    if (pending.current || !session) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    const previous = preview;
    setPreview(null);
    try {
      const result = await api<Preview>(
        `/ride-cases/${encodeURIComponent(id)}/${partial?"partial-refund-preview":"wallet-refund-preview"}${check ? "/check" : ""}`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: check
            ? { preview_token: previous?.preview_token }
            : { reason: reason.trim(),...(partial?{amount}: {}) },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) {
        setPreview(result);
        setNow(Date.now());
      }
    } catch (e) {
      if (pending.current === controller)
        setError(
          e instanceof Error
            ? e.message
            : "Preview unavailable. Prepare a new preview.",
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
      <h2 className="text-lg font-semibold">{partial?"Partial wallet refund preview":"Full wallet refund preview"}</h2>
      <p className="text-sm text-slate-600">
        {partial?'Enter the amount justified by the ended dispute. The remainder stays held for a separate settlement decision. This preview does not approve a refund or move money. Submit for independent review before an authorized reviewer can apply the refund.':'For the assigned case reviewer. Preview a full return of held wallet funds with no deductions. Resolve assessment blockers and any active proposal first. This does not establish entitlement, approve a refund or move money.'}
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {!preview && !busy && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void request();
          }}
        >
          <label className="block text-sm">
            {partial?"Partial-refund reason":"Full-refund reason"}
            <Input
              className="mt-2 block w-full rounded border p-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              maxLength={500}
            />
          </label>
          {partial&&<label className="block text-sm">Refund amount (INR)<Input className="mt-2 block w-full rounded border p-2" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} required pattern="(?:0|[1-9][0-9]*)(?:[.][0-9]{1,2})?"/></label>}
          <Button type="submit" disabled={reason.trim().length < 10||(partial&&!amount)}>
            {partial?"Prepare partial-refund preview":"Prepare full-refund preview"}
          </Button>
        </form>
      )}
      {busy && <p role="status">Checking current case and wallet evidence…</p>}
      {preview && (
        <div className="space-y-3">
          <p className="font-semibold">
            {expired ? "Preview expired" : "Preview only · Not approved"}
          </p>
          <p>
            {partial?"Proposed partial refund:":"Proposed full refund:"}{" "}
            <strong>
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(preview.amount_paise / 100)}
            </strong>
          </p>
          {partial&&<p>Remaining held: <strong>{typeof preview.remaining_held_paise==='number'?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(preview.remaining_held_paise/100):"Unavailable"}</strong></p>}
          <p className="text-sm">Reason: {preview.reason}</p>
          <p className="text-sm text-slate-600">
            Expires{" "}
            {new Date(preview.expires_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              dateStyle: "medium",
              timeStyle: "medium",
            })}{" "}
            IST. {partial?"Funds remain unchanged. Submit for independent approval. Execution remains unavailable.":"Funds are not reserved. Submit for independent review when the case evidence justifies a full refund. Execution remains a separate step."}
          </p>
          {
            <RefundProposalSubmit
              partial={partial}
              remaining={preview.remaining_held_paise}
              expired={!!expired}
              key={preview.preview_token}
              caseId={id}
              token={preview.preview_token}
              amount={preview.amount_paise}
              reason={preview.reason}
              onSaved={() => {
                clear();
                onProposed?.();
              }}
            />
          }
          <Button variant="outline" onClick={() => void request(!expired)}>
            {expired ? "Prepare new preview" : "Recheck preview"}
          </Button>
        </div>
      )}
      {(preview || busy) && (
        <Button variant="outline" onClick={clear}>
          {busy ? "Cancel preview" : "Hide preview"}
        </Button>
      )}
    </section>
  );
}
