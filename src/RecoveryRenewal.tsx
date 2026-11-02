import {Input} from '@/components/ui/input';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
export function RecoveryRenewal() {
  const { session, accept } = useAuth();
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || pending.current) return;
    const form = event.currentTarget,
      values = new FormData(form);
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        recovery_codes: string[];
        recovery_codes_remaining: number;
      }>("/auth/renew-recovery", {
        method: "POST",
        csrf: session.csrf_token,
        body: {
          current_password: values.get("current_password"),
          code: values.get("code"),
        },
      });
      form.reset();
      accept({
        ...session,
        recovery_codes: result.recovery_codes,
        recovery_codes_remaining: result.recovery_codes_remaining,
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Recovery-code renewal could not be confirmed.",
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
          <ShieldCheck className="mt-1 size-5 text-emerald-700" />
          <div>
            <h2 className="text-lg font-semibold">Recovery codes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {session?.recovery_codes_remaining === undefined
                ? "Backup-code count is unavailable."
                : `${session.recovery_codes_remaining} backup codes remaining at your last account refresh.`}{" "}
              Each code works once with your password if your authenticator is
              unavailable.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Renewing replaces every old code and signs out other sessions.
              This session stays active so you can save the new codes.
            </p>
          </div>
        </div>
        {!open ? (
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setOpen(true)}
          >
            Renew recovery codes
          </Button>
        ) : (
          <form onSubmit={submit} className="mt-5 max-w-2xl space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
              >
                <p>{error}</p>
                <p className="mt-2">
                  If the connection failed after renewal, the old codes may
                  already be invalid. Keep your authenticator available and
                  renew again with a fresh code.
                </p>
              </div>
            )}
            <label className="block text-sm">
              Current password
              <Input
                name="current_password"
                type="password"
                autoComplete="current-password"
                required
                disabled={busy}
                className="mt-2 block w-full rounded-lg border p-3"
              />
            </label>
            <label className="block text-sm">
              Fresh authenticator code
              <Input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                disabled={busy}
                className="mt-2 block w-full rounded-lg border p-3"
              />
            </label>
            <p className="text-xs text-slate-500">
              Wait for the next authenticator code if you just signed in. Backup
              codes cannot authorize renewal.
            </p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                required
                disabled={busy}
                className="mt-1"
              />
              I understand that all old recovery codes will stop working.
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>
                {busy ? "Renewing…" : "Confirm renewal"}
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
