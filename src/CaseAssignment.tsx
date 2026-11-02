import {Input} from '@/components/ui/input';
import { CaseReassignment } from "./CaseReassignment";
import { CaseAssignmentHistory } from "./CaseAssignmentHistory";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Assignment = {
  version: number;
  assigned: boolean;
  assigned_to_me: boolean;
  can_claim: boolean;
  can_recover?: boolean;
  can_reassign?: boolean;
};
export function CaseAssignment({ id }: { id: string }) {
  const { session } = useAuth();
  if (!session?.staff.permissions.includes("cases.assign")) return null;
  return <CaseAssignmentControls id={id} />;
}
function CaseAssignmentControls({ id }: { id: string }) {
  const { session } = useAuth();
  const [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [pending, setPending] = useState<{
    action: string;
    version: number;
    reason: string;
  } | null>(null);
  const saving = useRef(false);
  const result = useRead<Assignment>(
    `/ride-cases/${encodeURIComponent(id)}/assignment`,
    revision,
  );
  const data = result?.data;
  const allowed = session?.staff.permissions.includes("cases.assign");
  function review(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!data) return;
    setPending({
      action: data.can_recover ? "recover" : data.assigned_to_me ? "release" : "claim",
      version: data.version,
      reason: String(new FormData(e.currentTarget).get("reason")).trim(),
    });
    setError("");
    setMessage("");
  }
  async function save() {
    if (!pending || !session || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await api(`/ride-cases/${encodeURIComponent(id)}/assignment`, {
        method: "POST",
        csrf: session.csrf_token,
        body: pending,
      });
      setMessage(
        pending.action === "claim"
          ? "Case assigned to you."
          : pending.action === "recover" ? "Inactive staff assignment released. The case is now unassigned." : "Your assignment was released.",
      );
      setPending(null);
      setRevision((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Assignment could not be confirmed. Refresh before trying again.",
      );
      setPending(null);
      setRevision((v) => v + 1);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Case assignment</h2>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setPending(null);
            setRevision((v) => v + 1);
          }}
        >
          Refresh assignment
        </Button>
      </div>
      <p className="text-sm text-slate-600">
        Assignment identifies the staff member reviewing this case. It does not
        resolve the case or change the ride or payment.
      </p>
      {!result && <p role="status">Loading assignment…</p>}
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
          <p className="font-medium">
            {data.assigned_to_me
              ? "Assigned to you"
              : data.can_recover
                ? "Assigned to an inactive staff member"
                : data.assigned
                ? "Assigned to another staff member"
                : "Unassigned"}
          </p>
          {allowed &&
            (data.can_claim || data.assigned_to_me || data.can_recover) &&
            (pending ? (
              <div className="space-y-3">
                <p>
                  {pending.action === "claim"
                    ? "Assign this case to yourself?"
                    : pending.action === "recover" ? "Release this inactive staff assignment? The case will become unassigned." : "Release your assignment?"}
                </p>
                <p className="text-sm">Reason: {pending.reason}</p>
                <div className="flex gap-3">
                  <Button disabled={busy} onClick={() => void save()}>
                    {busy ? "Saving…" : "Confirm assignment change"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setPending(null)}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={review} className="space-y-3">
                <label className="block text-sm">
                  Assignment reason
                  <Input
                    name="reason"
                    minLength={5}
                    maxLength={500}
                    required
                    className="mt-2 block w-full rounded border p-2"
                  />
                </label>
                <Button type="submit">
                  {data.can_recover ? "Review recovery" : data.assigned_to_me ? "Review release" : "Review assignment"}
                </Button>
              </form>
            ))}
          {!data.assigned && !data.can_claim && (
            <p className="text-sm">
              Only open or waiting cases can be claimed.
            </p>
          )}
        </>
      )}
      {data?.can_reassign && !busy && <CaseReassignment key={`transfer:${revision}`} id={id} version={data.version} onFinished={(failure)=>{
        setPending(null);setError(failure||"");setMessage(failure?"":"Case assignment updated.");setRevision(v=>v+1);
      }}/>}
      <CaseAssignmentHistory key={revision} id={id} />
    </section>
  );
}
