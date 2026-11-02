import {Input} from '@/components/ui/input';
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
type Setup = { token: string; setup_secret: string; account: string };
export function AuthenticatorReplacement() {
  const { session, accept } = useAuth();
  const [open, setOpen] = useState(false), [setup, setSetup] = useState<Setup | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || pending.current) return;
    const form = event.currentTarget, values = new FormData(form);
    pending.current = true; setBusy(true); setError("");
    try {
      if (!setup) {
        const result = await api<Setup>("/auth/authenticator/start", { method: "POST", csrf: session.csrf_token,
          body: { current_password: values.get("password"), code: values.get("code") } });
        form.reset(); setSetup(result);
      } else {
        const result = await api<{ recovery_codes: string[]; recovery_codes_remaining: number }>("/auth/authenticator/confirm", {
          method: "POST", csrf: session.csrf_token, body: { token: setup.token, code: values.get("code") } });
        form.reset(); setSetup(null); setOpen(false);
        accept({ ...session, ...result });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authenticator change could not be confirmed.");
    } finally { pending.current = false; setBusy(false); }
  }
  return <Card><CardContent className="space-y-3 p-5 sm:p-6">
    <h2 className="text-lg font-semibold">Replace your authenticator</h2>
    <p className="text-sm leading-6 text-slate-600">Keep your current authenticator until you confirm the new one. Confirmation replaces backup codes and signs out other sessions.</p>
    {!open ? <Button variant="outline" onClick={() => setOpen(true)}>Replace authenticator</Button> : <form key={setup ? "confirm" : "start"} onSubmit={submit} className="max-w-xl space-y-4">
      {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800"><p>{error}</p>{setup && <p className="mt-2">If confirmation lost its connection, the new authenticator may already be active. Sign in again before retrying. You can renew backup codes after signing in.</p>}</div>}
      {setup ? <div className="space-y-2 rounded-lg bg-slate-50 p-4"><p className="text-sm">Add this setup key to your authenticator as a time-based account named Gilo Admin ({setup.account}). Confirm within five minutes.</p><code className="block break-all select-all rounded border bg-white p-3">{setup.setup_secret}</code><p className="text-xs text-slate-500">Keep this key private. It is never stored in browser storage.</p></div> : <label className="block text-sm">Current password<Input className="mt-2 block w-full rounded-lg border p-3" name="password" type="password" autoComplete="current-password" required disabled={busy} /></label>}
      <label className="block text-sm">{setup ? "New authenticator code" : "Current authenticator code"}<Input className="mt-2 block w-full rounded-lg border p-3" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} /></label>
      {!setup && <p className="text-xs text-slate-500">Use a fresh code. If you lost the authenticator, ask another owner for account recovery.</p>}
      <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "Verifying…" : setup ? "Confirm new authenticator" : "Continue setup"}</Button><Button variant="outline" disabled={busy} onClick={() => { setOpen(false); setSetup(null); setError(""); }}>Close setup</Button></div>
    </form>}
  </CardContent></Card>;
}
