import {Input} from '@/components/ui/input';
import { useEffect, useState, useRef } from "react";
import type { FormEvent, ReactNode } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "./api";
import { useAuth } from "./useAuth";
import type { Session } from "./authTypes";
type Challenge = {
  step: "enroll" | "verify";
  csrf_token: string;
  setup_secret?: string;
  account?: string;
};
const field =
  "mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-emerald-700 text-2xl font-bold text-white">
            G
          </span>
          <div>
            <p className="text-xl font-semibold">Gilo Admin</p>
            <p className="text-xs text-slate-500">Ride & trip operations</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-7">{children}</CardContent>
        </Card>
        <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={15} />
          Staff access is separate from rider and traveler accounts.
        </p>
      </div>
    </main>
  );
}
export function Login() {
  const auth = useAuth(),
    [challenge, setChallenge] = useState<Challenge | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [code, setCode] = useState(""),
    [useRecovery, setUseRecovery] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [invite] = useState(() =>
      window.location.pathname === "/activate"
        ? window.location.hash.slice(1)
        : "",
    ),
    pending = useRef(false);
  useEffect(() => {
    if (invite) window.history.replaceState(null, "", "/activate");
  }, [invite]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending.current) return;
    setError("");
    if (!challenge && invite && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (challenge) {
        const result = await api<Session>("/auth/verify", {
          method: "POST",
          csrf: challenge.csrf_token,
          body: useRecovery
            ? { recovery_code: code.trim() }
            : { code: code.trim() },
        });
        setCode("");
        setChallenge(null);
        auth.accept(result);
        if (invite) window.history.replaceState(null, "", "/");
      } else {
        const result = await api<Challenge | Session>(
          invite ? "/auth/activate" : "/auth/login",
          {
            method: "POST",
            body: invite ? { token: invite, password } : { email, password },
          },
        );
        setPassword("");
        setConfirm("");
        if ('staff' in result) {
          auth.accept(result);
          if (invite) window.history.replaceState(null, '', '/');
        } else setChallenge(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
      pending.current = false;
    }
  };
  return (
    <AuthFrame>
      <h1 className="text-2xl font-semibold">
        {challenge
          ? challenge.step === "enroll"
            ? "Set up your authenticator"
            : "Verify your sign-in"
          : invite
            ? "Activate your staff account"
            : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {challenge
          ? "Use your authenticator app to complete secure access."
          : invite
            ? "Choose a unique password. Authenticator setup comes next."
            : "Sign in with your staff email and password."}
      </p>
      {!!auth.unavailable && (
        <div
          className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          {auth.unavailable}
          <Button variant="link" onClick={() => void auth.reload()}>
            Retry connection
          </Button>
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-5">
        {!challenge ? (
          <>
            {!invite && (
              <label className="block text-sm font-medium">
                Staff email
                <Input
                  className={field}
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              Password
              <Input
                className={field}
                type="password"
                autoComplete={invite ? "new-password" : "current-password"}
                required
                minLength={invite ? 14 : undefined}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
            {invite && (
              <label className="block text-sm font-medium">
                Confirm password
                <Input
                  className={field}
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                />
              </label>
            )}
          </>
        ) : (
          <>
            {challenge.setup_secret && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm leading-6">
                  In your authenticator, choose{" "}
                  <strong>Enter a setup key</strong>. Use{" "}
                  <strong>Gilo Admin</strong>, account {challenge.account}, and
                  a time-based code.
                </p>
                <p className="mt-3 break-all rounded bg-white p-3 font-mono text-sm select-all">
                  {challenge.setup_secret}
                </p>
                <p className="mt-2 text-xs text-emerald-900">
                  Keep this key private. Enter the six-digit code below to
                  confirm setup.
                </p>
              </div>
            )}
            <label className="block text-sm font-medium">
              {useRecovery ? "Recovery code" : "Authenticator code"}
              <Input
                className={field + " font-mono tracking-wider"}
                autoComplete="one-time-code"
                inputMode={useRecovery ? "text" : "numeric"}
                pattern={useRecovery ? "[a-f0-9]{16}" : "[0-9]{6}"}
                maxLength={useRecovery ? 16 : 6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                disabled={busy}
              />
            </label>
            {challenge.step === "verify" && (
              <Button
                type="button"
                variant="link"
                disabled={busy}
                onClick={() => {
                  setUseRecovery(!useRecovery);
                  setCode("");
                  setError("");
                }}
              >
                {useRecovery
                  ? "Use authenticator instead"
                  : "Use a saved recovery code"}
              </Button>
            )}
          </>
        )}
        {!!error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={busy || !!auth.unavailable}
        >
          {busy
            ? "Please wait…"
            : challenge
              ? "Verify and sign in"
              : invite
                ? "Continue to authenticator"
                : "Continue"}
          <ArrowRight size={16} />
        </Button>
        {challenge && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setChallenge(null);
              setCode("");
              setError("");
              if (invite) window.location.assign("/");
            }}
          >
            Start again
          </Button>
        )}
      </form>
    </AuthFrame>
  );
}
export function RecoveryCodes() {
  const { recovery, acknowledgeRecovery } = useAuth();
  const [saved, setSaved] = useState(false);
  return (
    <AuthFrame>
      <h1 className="text-2xl font-semibold">Save your recovery codes</h1>
      <p className="my-4 text-sm leading-6 text-slate-500">
        These codes are shown once. Store them in a password manager. Each code
        works once, together with your password, if your authenticator is
        unavailable.
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 font-mono text-xs select-all">
        {recovery.map((code) => (
          <span key={code}>{code}</span>
        ))}
      </div>
      <label className="my-5 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={saved}
          onChange={(e) => setSaved(e.target.checked)}
        />
        I have securely saved my recovery codes
      </label>
      <Button
        className="w-full"
        disabled={!saved}
        onClick={acknowledgeRecovery}
      >
        Open workspace
      </Button>
    </AuthFrame>
  );
}
