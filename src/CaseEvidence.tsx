import {Input} from '@/components/ui/input';
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  items: { key: string; label: string; value: string; type: "text" | "time" }[];
  updated_at: string | null;
  viewed_at: string;
};
export function CaseEvidence({ id }: { id: string }) {
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
  if (!session?.staff.permissions.includes("cases.evidence.read")) return null;
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
        `/ride-cases/${encodeURIComponent(id)}/evidence`,
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
        setError(e instanceof Error ? e.message : "Could not open evidence.");
    } finally {
      if (pending.current === controller) {
        pending.current = null;
        setBusy(false);
      }
    }
  }
  return (
    <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">Restricted case evidence</h2>
      <p className="text-sm text-slate-600">
        Access is audited. This summary shows selected recorded facts, not proof
        of fault or a current balance. Raw evidence, locations, identifiers and
        resolution data are excluded.
      </p>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result ? (
        <>
          {result.items.length ? (
            <dl className="grid gap-4 sm:grid-cols-2">
              {result.items.map((item) => (
                <div key={item.key}>
                  <dt className="text-sm text-slate-500">
                    {item.label}
                    {item.type === "time" ? " (IST)" : ""}
                  </dt>
                  <dd>
                    {item.type === "time"
                      ? new Date(item.value).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : item.value.replaceAll("_", " ")}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>No supported evidence fields are recorded.</p>
          )}
          <p className="text-xs text-slate-500">
            Snapshot accessed{" "}
            {new Date(result.viewed_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST. Recorded facts may differ from current journey or payment
            state.
          </p>
          <Button variant="outline" onClick={hide}>
            Hide evidence
          </Button>
        </>
      ) : (
        <form className="space-y-3" onSubmit={reveal}>
          <label className="block text-sm">
            Reason for evidence access
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
              {busy ? "Opening…" : "View evidence"}
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
