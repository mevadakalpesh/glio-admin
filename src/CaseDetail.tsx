import {CaseSchedule} from './CaseSchedule';
import {CaseAssistedExit} from "./CaseAssistedExit";
import {CaseExitReview} from "./CaseExitReview";
import { CaseFollowups } from "./CaseFollowups";
import { RemainderPreview } from "./RemainderPreview";
import { CaseResolution } from "./CaseResolution";
import { CaseClosureReadiness } from "./CaseClosureReadiness";
import { WalletRefundPreview } from "./WalletRefundPreview";
import { WalletRefundAssessment } from "./WalletRefundAssessment";
import { CaseFinancialReview } from "./CaseFinancialReview";
import { CaseProposals } from "./CaseProposals";
import { CaseAssignment } from "./CaseAssignment";
import { CaseEvidence } from "./CaseEvidence";
import { CaseDescription } from "./CaseDescription";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRead } from "./useRead";
import { Button } from "@/components/ui/button";
type Detail = {
  item: {
    id: string;
    ride_request_id: string;
    trip_id: string;
    kind: string | null;
    status: string | null;
    created_at: string | null;
    updated_at: string | null;
    passenger_exit_confirmed_at: string | null;
    resolved_at: string | null;
  };
  activity: {
    items: {
      id: string;
      action: string;
      from_status: number | null;
      to_status: number | null;
      from_label: string | null;
      to_label: string | null;
      created_at: string | null;
    }[];
    page: number;
    page_size: number;
    total: number;
  };
  generated_at: string;
};
const time = (value: string | null) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";
export function CaseDetail({ id }: { id: string }) {
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [executionNotice, setExecutionNotice] = useState("");
  const result = useRead<Detail>(
    `/ride-cases/${encodeURIComponent(id)}?activity_page=${encodeURIComponent(params.get("activity_page") || "1")}`,
    version,
  );
  const back = new URLSearchParams(params);
  back.delete("case");
  back.delete("activity_page");
  const data = result?.data;
  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set("activity_page", String(value));
    setParams(next);
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ride case details</h1>
        <div className="flex gap-4">
          <Link className="text-emerald-800 underline" to={`/support?${back}`}>
            Back to cases
          </Link>
          <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
            Refresh case
          </Button>
        </div>
      </div>
      <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">
        Case review. Exit confirmation does not establish fault or settlement.
        Case descriptions require separate audited access below. Evidence and
        financial decisions remain restricted.
      </p>
      {executionNotice && (
        <p
          role="status"
          className="rounded border bg-emerald-50 p-3 text-emerald-800"
        >
          {executionNotice}
        </p>
      )}
      {!result && <p role="status">Loading case…</p>}
      {result?.error && (
        <p role="alert" className="text-red-800">
          {result.error}
        </p>
      )}
      {data && (
        <>
          <div className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">
              {(data.item.kind || "Unknown issue").replaceAll("_", " ")} ·{" "}
              {(data.item.status || "Unknown status").replaceAll("_", " ")}
            </h2>
            <p className="mt-1 break-all text-xs text-slate-500">
              Case {data.item.id}
            </p>
            <dl className="my-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Created", data.item.created_at],
                ["Last updated", data.item.updated_at],
                ["Exit confirmed", data.item.passenger_exit_confirmed_at],
                ["Resolved", data.item.resolved_at],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm text-slate-500">{label} (IST)</dt>
                  <dd>{time(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="flex gap-5">
              <Link
                className="text-emerald-800 underline"
                to={`/trips?kind=rides&id=${data.item.ride_request_id}`}
              >
                View ride
              </Link>
              <Link
                className="text-emerald-800 underline"
                to={`/trips?kind=trips&id=${data.item.trip_id}`}
              >
                View trip
              </Link>
            </div>
          </div>
          {data.item.status === "resolved" && (
            <CaseResolution key={`resolution:${id}:${version}`} id={id} />
          )}
          <CaseAssignment key={`assignment:${id}:${version}`} id={id} />
          <CaseAssistedExit key={`assisted:${id}:${version}`} id={id} onChanged={message=>{setExecutionNotice(message);setVersion(v=>v+1);}}/>
          <CaseExitReview key={`exit:${id}:${version}`} id={id}/>
          <CaseSchedule key={`schedule:${id}:${version}`} id={id}/>
          <CaseFollowups key={`followups:${id}:${version}`} id={id}/>
          <CaseDescription key={`${id}:${version}`} id={id} />
          <CaseEvidence key={`evidence:${id}:${version}`} id={id} />
          <WalletRefundAssessment key={`refund:${id}:${version}`} id={id} />
          <WalletRefundAssessment key={`remainder:${id}:${version}`} id={id} remainder />
          <RemainderPreview key={`remainder-preview:${id}:${version}`} id={id} onProposed={() => { setExecutionNotice("Remaining-balance proposal submitted. No funds moved."); setVersion(value => value + 1); }} />
          <WalletRefundPreview key={`partial:${id}:${version}`} id={id} partial />
          <WalletRefundPreview
            key={`refund-preview:${id}:${version}`}
            id={id}
            onProposed={() => {
              setExecutionNotice(
                "Refund proposal submission recorded. View proposals for its current review status. No money moved.",
              );
              setVersion((v) => v + 1);
            }}
          />
          <CaseFinancialReview key={`financial:${id}:${version}`} id={id} />
          <CaseClosureReadiness key={`closure:${id}:${version}`} id={id} />
          <CaseProposals
            key={`proposals:${id}:${version}`}
            id={id}
            onExecuted={(message) => {
              setExecutionNotice(
                message ||
                  "Further investigation execution recorded. Current case details have been refreshed.",
              );
              setVersion((v) => v + 1);
            }}
          />
          <h2 className="text-lg font-semibold">Related ride activity</h2>
          <p className="text-sm text-slate-600">
            Newest first. These are events for the whole ride, not just this
            case.
          </p>
          {data.activity.items.length ? (
            <ol className="divide-y rounded-xl border bg-white">
              {data.activity.items.map((event) => (
                <li key={event.id} className="p-4">
                  <p className="font-medium">
                    {(event.action || "Recorded event").replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-slate-500">
                    {time(event.created_at)} IST
                  </p>
                  {(event.from_status !== null || event.to_status !== null) && (
                    <p className="text-sm">
                      Status:{" "}
                      {(event.from_label || "Not recorded").replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      →{" "}
                      {(event.to_label || "Not recorded").replaceAll("_", " ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p>No recorded ride activity.</p>
          )}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              disabled={data.activity.page <= 1}
              onClick={() => page(data.activity.page - 1)}
            >
              Previous activity
            </Button>
            <span>
              Page {data.activity.page} · {data.activity.total} events
            </span>
            <Button
              variant="outline"
              disabled={
                data.activity.page * data.activity.page_size >=
                data.activity.total
              }
              onClick={() => page(data.activity.page + 1)}
            >
              Next activity
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Updated {time(data.generated_at)} IST
          </p>
        </>
      )}
    </section>
  );
}
