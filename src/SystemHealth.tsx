import {MatchingQueueHealth, type MatchingQueueSnapshot} from './MatchingQueueHealth';
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
type Automation = {id:string;label:string;interval_seconds:number;stale_after_seconds:number;status:string;started_at:string|null;finished_at:string|null};
type Result = { matching_queue?:MatchingQueueSnapshot; automations?:Automation[]; generated_at: string; recent_from: string; signals: {id: string; count: number | null; status: string}[] };
const signals = [
  {id: "notifications_failed", title: "Failed notification events", detail: "Updated in the last 24 hours. Events are not unique recipients.", path: "/notifications?status=failed", permission: "notifications.delivery.read"},
  {id: "notifications_retry", title: "Notifications awaiting retry", detail: "Recorded journey, support and review events eligible for worker retry. This does not confirm the worker is running.", path: "/notifications?retry=eligible", permission: "notifications.delivery.read"},
  ...["PRODUCTION", "SANDBOX"].flatMap(environment => [
    {id: `${environment}_payment_errors`, title: `${environment === "PRODUCTION" ? "Live" : "Test"} payments with recorded errors`, detail: "All recorded non-empty errors, including historical or resolved issues. Not a provider outage count.", path: `/payments?environment=${environment}&issue=recorded_error`, permission: "payments.read"},
    {id: `${environment}_refund_pending`, title: `${environment === "PRODUCTION" ? "Live" : "Test"} refunds pending`, detail: "Current local order state. This does not confirm provider processing or refund receipt.", path: `/payments?environment=${environment}&state=refund_pending`, permission: "payments.read"},
  ]),
];
export function SystemHealth() {
  const {session} = useAuth();
  return session?.staff.permissions.includes("health.read") ? <HealthSnapshot /> : <p>You do not have access to system health.</p>;
}
function HealthSnapshot() {
  const {session} = useAuth();
  const [version, setVersion] = useState(0);
  const result = useRead<Result>("/health", version);
  const data = result?.data;
  const stamp = data?.generated_at && Number.isFinite(Date.parse(data.generated_at)) ? new Date(data.generated_at).toLocaleString("en-IN", {timeZone:"Asia/Kolkata", dateStyle:"medium", timeStyle:"medium"}) : "Unavailable";
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">System health</h1><Button variant="outline" disabled={!result} onClick={()=>setVersion(v=>v+1)}>Refresh health</Button></div>
    <p className="rounded-xl border bg-white p-4 text-sm text-slate-600">Recorded operational signals for Gilo rides and trips. These counts are a snapshot, not an uptime check. No provider requests, retries or financial actions run from this screen.</p>
    {!result && <p role="status">Loading operational signals…</p>}
    {result?.error && <p role="alert">{result.error}</p>}
    {data && <><p className="text-sm text-slate-500">Snapshot: {stamp} IST. Refresh for current evidence.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{signals.map(signal=>{
        const value=data.signals.find(item=>item.id===signal.id);
        const count=value?.status==='recorded' && typeof value.count==='number' && Number.isSafeInteger(value.count) && value.count>=0 ? value.count : null;
        const path=signal.path;
        return <Card key={signal.id}><CardHeader><CardTitle className="text-base">{signal.title}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-3xl font-semibold">{count===null?'Unavailable':count.toLocaleString('en-IN')}</p><p className="text-sm text-slate-600">{signal.detail}</p>{session?.staff.permissions.includes(signal.permission) && <Link className="text-sm font-medium text-emerald-700 underline" to={path}>{signal.id==='notifications_failed'?'View all failed events':'Inspect records'}</Link>}</CardContent></Card>;
      })}</div>
      <Link className="text-sm font-medium text-emerald-700 underline" to="/map-health">Inspect map-service request evidence</Link>
      <MatchingQueueHealth snapshot={data.matching_queue}/>
      <Card><CardHeader><CardTitle>Scheduled ride & support jobs</CardTitle></CardHeader><CardContent className="space-y-4">
        <p className="text-sm text-slate-600">Latest recorded execution across application instances. “Returned” means the scheduled function returned; it may have skipped work or handled individual failures internally. It does not confirm payment settlement or notification delivery.</p>
        {!data.automations?.length?<p>Automation monitoring unavailable. Deploy the heartbeat schema and updated scheduler, then refresh.</p>:<div className="grid gap-3 md:grid-cols-2">{data.automations.map(job=>{
          const labels:Record<string,string>={never_recorded:'No execution recorded',unavailable:'Monitoring unavailable',running:'Execution in progress',returned:'Execution returned',threw:'Execution failed',stale:'Activity overdue'};
          const bad=['stale','threw','unavailable','never_recorded'].includes(job.status);
          const time=(v:string|null)=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Not recorded';
          return <article key={job.id} className="space-y-2 rounded-lg border p-3"><h3 className="font-semibold">{job.label}</h3><p className={bad?'font-medium text-amber-800':'font-medium text-slate-700'}>{labels[job.status]||'Monitoring unavailable'}</p><p className="text-xs text-slate-600">Expected every {job.interval_seconds/60} min · Flagged after {job.stale_after_seconds/60} min without a newer start</p><p className="text-xs">Last start: {time(job.started_at)}<br/>Last finish: {time(job.finished_at)}</p>{job.status==='stale'&&<p className="text-sm">Check the scheduler process and logs. This screen cannot restart or retry a job.</p>}</article>;
        })}</div>}
      </CardContent></Card>
    </>}
    <Card><CardHeader><CardTitle>Monitoring still to connect</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">API uptime, socket connectivity, queue consumers, other scheduled jobs, general Redis health, map-provider quotas and backup verification are not monitored here yet. Zero recorded issues does not establish that these services are healthy.</p></CardContent></Card>
  </section>;
}
