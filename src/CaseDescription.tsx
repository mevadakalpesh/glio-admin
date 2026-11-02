import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  description: string;
  truncated: boolean;
  updated_at: string | null;
  viewed_at: string;
};
export function CaseDescription({ id }: { id: string }) {
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
  if (!session?.staff.permissions.includes("cases.description.read"))
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
        `/ride-cases/${encodeURIComponent(id)}/description`,
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
        setError(
          e instanceof Error ? e.message : "Could not open description.",
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
      <h2 className="text-lg font-semibold">Restricted case description</h2>
      <p className="text-sm text-slate-600">
        Access is audited. This is the participant’s statement, not a verified
        finding. Evidence and resolution data are not included.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result ? (
        <>
          <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4">
            {result.description || "No description recorded."}
          </p>
          {result.truncated && (
            <p className="text-sm text-amber-800">
              Only the first 20,000 characters are shown.
            </p>
          )}
          <Button variant="outline" onClick={hide}>
            Hide description
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
              {busy ? "Opening…" : "View description"}
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
