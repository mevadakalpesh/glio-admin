import {Input} from '@/components/ui/input';
import {NotificationRetry} from './NotificationRetry';
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "./useAuth";
import { api } from "./api";
import { Button } from "@/components/ui/button";
type Result = {
  status: string;
  delivery_attempts?:number;attempt_limit?:number;next_retry_at?:string|null;manual_retry_eligible?:boolean;manual_retry_used?:boolean;
  automatic_retry_eligible?: boolean;
  search_restart?: "enqueued" | "not_recorded" | "not_requested";
  search_enqueued_at?: string | null;
  notes: string[];
  provider_reference_recorded: boolean;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  viewed_at: string;
};
export function NotificationInspection({ id }: { id: string }) {
  const { session } = useAuth();
  const [result, setResult] = useState<Result | null>(null),
    [notice,setNotice]=useState(''),
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
  if (!session?.staff.permissions.includes("notifications.delivery.inspect"))
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
        `/notification-delivery/${encodeURIComponent(id)}/inspection`,
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
          e instanceof Error ? e.message : "Could not inspect notification.",
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
      <h2 className="text-lg font-semibold">Notification inspection</h2>
      <p className="text-sm text-slate-600">
        Access is audited. This is recorded delivery evidence, not a live device
        or provider check. Raw errors and message content are withheld.
      </p>
      {notice&&<p role="status" className="rounded bg-emerald-50 p-3">{notice}</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {result ? (
        <>
          <p className="font-semibold">Recorded status: {result.status}</p>
          <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-600">Automatic retry</dt><dd className="font-medium">{result.automatic_retry_eligible === true ? "Eligible for worker retry" : result.automatic_retry_eligible === false ? "Not eligible for worker retry" : "Not recorded"}</dd></div>
            <div><dt className="text-slate-600">Rider-search restart</dt><dd className="font-medium">{result.search_restart === "enqueued" ? "Enqueue recorded" : result.search_restart === "not_requested" ? "Not requested" : "No enqueue checkpoint recorded"}</dd></div>
          </dl>
          <p className="text-sm">Recorded attempts: {result.delivery_attempts??'Not recorded'} / {result.attempt_limit??'Not recorded'} · Extra attempt {result.manual_retry_used?'already authorized':'not authorized'}</p>
          {result.next_retry_at&&<p className="text-sm">Next attempt after {new Date(result.next_retry_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p>}
          {result.manual_retry_eligible&&<NotificationRetry key={id} id={id} onQueued={()=>{setResult(null);setNotice('Extra attempt authorized for the worker. Inspect again to refresh delivery status; authorization is not proof of delivery.');}}/>}
          <ul className="list-disc space-y-2 pl-5 text-sm">
            {result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <dl className="space-y-2 text-sm">
            {[
              ["Sent", result.sent_at],
              ["Delivered", result.delivered_at],
              ["Read", result.read_at],
              ["Search enqueued", result.search_enqueued_at],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label} (IST)</dt>
                <dd>
                  {value
                    ? new Date(value).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Not recorded"}
                </dd>
              </div>
            ))}
          </dl>
          <Button variant="outline" onClick={hide}>
            Hide inspection
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
              {busy ? "Opening…" : "Inspect delivery"}
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
