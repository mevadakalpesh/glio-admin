import { AuthenticatorReplacement } from "./AuthenticatorReplacement";
import { RecoveryRenewal } from "./RecoveryRenewal";
import { PasswordChange } from "./PasswordChange";
import { useRef, useState } from "react";
import { Monitor, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
type Entry = {
  id: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  ip: string | null;
  user_agent: string | null;
  current: boolean;
};
type Page = { items: Entry[]; total: number; page: number };
const date = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export function Sessions() {
  const { session, reload } = useAuth();
  const [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [selected, setSelected] = useState<Entry | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const pending = useRef(false);
  const result = useRead<Page>(`/auth/sessions?page=${page}`, version);
  const refresh = () => {
    setSelected(null);
    setError("");
    setVersion((v) => v + 1);
  };
  const revoke = async () => {
    if (!selected || !session || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await api<{ signed_out: boolean }>(
        `/auth/sessions/${selected.id}/revoke`,
        { method: "POST", csrf: session.csrf_token, body: {} },
      );
      setSelected(null);
      if (response.signed_out) {
        await reload();
        return;
      }
      setNotice("Session signed out. It can no longer access Gilo Admin.");
      setVersion((v) => v + 1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not sign out this session. Refresh and try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="sessions-title" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-emerald-700">
            Account security
          </p>
          <h1 id="sessions-title" className="mt-2 text-3xl font-semibold">
            Your active sessions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review your Gilo Admin sign-ins and sign out any session you do not
            recognise. Times are shown in India Standard Time.
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={refresh}>
          Refresh sessions
        </Button>
      </div>
      <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        <ShieldCheck className="mt-1 size-5 shrink-0" />
        <p>
          Sessions expire after 30 minutes of inactivity or 8 hours from
          sign-in. Browser information and network addresses are indicators, not
          proof of a device’s identity.
        </p>
      </div>
      {(error || result?.error) && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error || result?.error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-4 text-emerald-800"
        >
          {notice}
        </p>
      )}
      {!result && <p role="status">Loading sessions…</p>}
      {result?.data?.items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="rounded-xl bg-slate-100 p-3 self-start">
                  <Monitor className="size-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {item.current ? "This session" : "Other session"}
                  </h2>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {item.user_agent || "Browser information unavailable"}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Network address: {item.ip || "Unavailable"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setSelected(item);
                  setError("");
                  setNotice("");
                }}
              >
                Sign out {item.current ? "this session" : "session"}
              </Button>
            </div>
            <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-3">
              {[
                ["Signed in", item.created_at],
                ["Last activity", item.last_seen_at],
                ["Expires by", item.expires_at],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="mt-1 font-medium">{date(value)}</dd>
                </div>
              ))}
            </dl>
            {selected?.id === item.id && (
              <div
                role="region"
                aria-label="Confirm session sign-out"
                className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4"
              >
                <p className="font-medium">
                  {item.current
                    ? "Sign out of this browser?"
                    : "Sign out this other session?"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {item.current
                    ? "You will return to staff sign-in."
                    : "That session will need to sign in and verify MFA again. Your current session stays active."}
                </p>
                <div className="mt-3 flex gap-3">
                  <Button disabled={busy} onClick={() => void revoke()}>
                    {busy ? "Signing out…" : "Confirm sign out"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setSelected(null)}
                  >
                    Keep session
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {result?.data?.items.length === 0 && (
        <p className="rounded-xl border bg-white p-5">
          No active sessions on this page. Refresh or return to the previous
          page.
        </p>
      )}
      {result?.data && (
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            disabled={page === 1 || busy}
            onClick={() => {
              setSelected(null);
              setPage((p) => p - 1);
            }}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-600">
            Page {page} · {result.data.total} active sessions
          </span>
          <Button
            variant="outline"
            disabled={page * 25 >= result.data.total || busy}
            onClick={() => {
              setSelected(null);
              setPage((p) => p + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
      <PasswordChange />
      {session?.staff.mfa_required !== false && <><RecoveryRenewal /><AuthenticatorReplacement /></>}
    </section>
  );
}
