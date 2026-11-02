import {Textarea} from '@/components/ui/textarea';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { api } from "./api";
import type { Staff } from "./authTypes";
import { invitationLabel } from "./invitationLabel";
export function InvitationActions({
  staff,
  allowRecovery = false,
  csrf,
  busy,
  onBusy,
  onComplete,
}: {
  staff: Staff;
  allowRecovery?: boolean;
  csrf: string;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onComplete: (link: string, recovery?: boolean) => void;
}) {
  const [action, setAction] = useState<"renew" | "revoke" | "recover" | null>(null),
    [error, setError] = useState("");
  const pending = useRef(false);
  const recoverable = allowRecovery && staff.active && ["enrolled", "mfa_pending"].includes(staff.invitation_state || "");
  if (
    !staff.invitation_revision ||
    !recoverable && !["pending", "expired", "not_invited"].includes(
      staff.invitation_state || "",
    )
  )
    return null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || busy || !action) return;
    const reason = new FormData(event.currentTarget).get("reason");
    pending.current = true;
    onBusy(true);
    setError("");
    try {
      const result = await api<{ invitation_url?: string }>(
        `/staff/${staff.id}/invitation`,
        {
          method: "POST",
          csrf,
          body: { action, reason, revision: staff.invitation_revision, ...(action === "recover" ? { identity_verified: new FormData(event.currentTarget).get("identity_verified") === "on" } : {}) },
        },
      );
      if (action === "recover") onComplete(result.invitation_url || "", true);
      else onComplete(result.invitation_url || "");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not change this invitation. Refresh and try again.",
      );
    } finally {
      pending.current = false;
      onBusy(false);
    }
  }
  return (
    <section className="mt-6 border-t pt-5" aria-label="Manage invitation">
      <h3 className="font-semibold">
        {invitationLabel(staff.invitation_state)}
      </h3>
      {staff.invitation_expires_at && (
        <p className="mt-1 text-sm text-slate-500">
          Invitation expiry:{" "}
          {new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(staff.invitation_expires_at))}{" "}
          IST
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">
        {recoverable ? "After verifying identity, reset this account's password and authenticator. Existing sessions and recovery codes stop working immediately. The private setup link expires in 30 minutes." : "Renewing creates a new private link valid for 24 hours and invalidates the previous link. Revoking withdraws the unused invitation."}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {!action ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy || !staff.active}
            onClick={() => setAction(recoverable ? "recover" : "renew")}
          >
            {recoverable ? "Recover staff account" : "Renew invitation"}
          </Button>
          {!recoverable && staff.invitation_state !== "not_invited" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAction("revoke")}
            >
              Revoke invitation
            </Button>
          )}
          {!staff.active && (
            <p className="w-full text-sm text-slate-500">
              Enable this account before renewing an invitation.
            </p>
          )}
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4"
        >
          <h4 className="font-medium">
            {action === "recover" ? "Reset staff access?" : action === "renew"
              ? "Replace the existing invitation?"
              : "Withdraw this invitation?"}
          </h4>
          <label className="block text-sm">
            Invitation change reason
            <Textarea
              className="mt-2 block w-full rounded-lg border bg-white p-3"
              name="reason"
              required
              minLength={5}
              maxLength={500}
              disabled={busy}
            />
          </label>
          {action === "recover" && <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="identity_verified" required disabled={busy} />I verified this staff member’s identity through a trusted channel and will share the setup link privately.</label>}
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy
                ? "Saving…"
                : action === "recover" ? "Confirm account recovery" : action === "renew"
                  ? "Confirm renewal"
                  : "Confirm revocation"}
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                setAction(null);
                setError("");
              }}
            >
              {recoverable ? "Keep account unchanged" : "Keep invitation"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
