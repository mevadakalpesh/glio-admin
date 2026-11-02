import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  recorded: boolean;
  outcome: string;
  basis: string | null;
  reason: string;
  truncated: boolean;
  resolved_at: string | null;
  by_you: boolean;
  viewed_at: string;
};
export function CaseResolution({ id }: { id: string }) {
  const { session } = useAuth();
  const [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      pending.current?.abort();
      pending.current = null;
    },
    [],
  );
  if (!session?.staff.permissions.includes("cases.resolution.read"))
    return null;
  function hide() {
    pending.current?.abort();
    pending.current = null;
    setResult(null);
    setError("");
    setBusy(false);
  }
  async function reveal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session) return;
    const reason = String(
      new FormData(event.currentTarget).get("reason") || "",
    ).trim();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const data = await api<Result>(
        `/ride-cases/${encodeURIComponent(id)}/resolution`,
        {
          method: "POST",
          csrf: session.csrf_token,
          body: { reason },
          signal: controller.signal,
        },
      );
      if (pending.current === controller) setResult(data);
    } catch (e) {
      if (pending.current === controller)
        setError(e instanceof Error ? e.message : "Could not open resolution.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Recorded case resolution</h2>
      <p className="text-sm text-slate-600">
        Access is audited. This shows the recorded closure outcome, not a new
        decision or confirmation of the current payment state.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result ? (
        <>
          <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4">
            {result.outcome}
          </p>
          {result.recorded && (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Resolved (IST)</dt>
                <dd>
                  {result.resolved_at
                    ? new Date(result.resolved_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Time not recorded"}
                </dd>
              </div>
              {result.basis && (
                <div>
                  <dt className="text-slate-500">Recorded closure basis</dt>
                  <dd>{result.basis}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Recorded reason</dt>
                <dd className="whitespace-pre-wrap break-words">
                  {result.reason || "No reason recorded."}
                </dd>
              </div>
              {result.by_you && <p>Recorded by you.</p>}
            </dl>
          )}
          {result.truncated && (
            <p className="text-sm text-amber-800">
              Only the first 1,000 characters are shown.
            </p>
          )}
          <Button variant="outline" onClick={hide}>
            Hide resolution
          </Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={reveal}>
          <label className="block text-sm">
            Reason for access
            <Input
              className="mt-2 block w-full rounded-lg border p-2"
              name="reason"
              minLength={5}
              maxLength={500}
              required
              disabled={busy}
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Opening…" : "View resolution"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={hide}>
                Cancel access
              </Button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
