import {Input} from '@/components/ui/input';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
const field = "mt-2 block w-full rounded-lg border bg-white px-3 py-2";
export function PasswordChange() {
  const { session, reload } = useAuth();
  const requireCode = session?.staff.mfa_required !== false;
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    const current = String(values.get("current_password") || ""),
      next = String(values.get("new_password") || ""),
      confirmation = String(values.get("confirm_password") || ""),
      code = String(values.get("code") || "");
    setError("");
    if (next !== confirmation) {
      setError("The new passwords do not match.");
      return;
    }
    if (next.length < 14 || new TextEncoder().encode(next).length > 72) {
      setError("Use at least 14 characters and no more than 72 bytes.");
      return;
    }
    if (current === next) {
      setError("Choose a different password from your current one.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        csrf: session.csrf_token,
        body: { current_password: current, new_password: next, code },
      });
      form.reset();
      await reload();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Password change could not be confirmed. Try signing in again before retrying.",
      );
      const input = form.elements.namedItem("code") as HTMLInputElement | null;
      if (input) input.value = "";
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <KeyRound className="mt-1 size-5 text-emerald-700" />
          <div>
            <h2 className="text-lg font-semibold">Change your password</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {requireCode ? "Confirm your current password and a fresh authenticator code." : "Confirm your current password."}
              Changing your password signs you out of every Gilo Admin session,
              including this browser.
            </p>
          </div>
        </div>
        {!open ? (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Change password
          </Button>
        ) : (
          <form
            onSubmit={submit}
            className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-2"
          >
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2"
              >
                {error}
              </p>
            )}
            <label className="text-sm sm:col-span-2">
              Current password
              <Input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                className={field}
              />
            </label>
            <label className="text-sm">
              New password
              <Input
                name="new_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                disabled={busy}
                className={field}
              />
            </label>
            <label className="text-sm">
              Confirm new password
              <Input
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={14}
                disabled={busy}
                className={field}
              />
            </label>
            <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
              Use at least 14 characters (maximum 72 bytes). A long, unique
              passphrase is suitable. You will need the new password and MFA to
              sign in again.
            </p>
            {requireCode && <label className="text-sm">
              Authenticator code
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={busy}
                className={field}
              />
            </label>}
            {requireCode && <p className="self-center text-xs leading-5 text-slate-500">
              Use a fresh six-digit code. If you just signed in, wait for the
              next code. Recovery codes cannot authorize a password change.
            </p>}
            <label className="flex items-start gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                required
                disabled={busy}
                className="mt-1"
              />
              I understand that all my sessions will be signed out.
            </label>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Changing password…" : "Change password and sign out"}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
