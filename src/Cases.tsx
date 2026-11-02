import {FilterBuilder} from "@/components/ui/filter-builder";
import { RefreshCw, Inbox, Info, ChevronRight, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ColumnPicker } from '@/components/ui/column-picker';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { CaseDetail } from "./CaseDetail";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useRead } from "./useRead";
import { useAuth } from "./useAuth";
import { Button } from "@/components/ui/button";
type CaseRow = {
  id: string;
  ride_request_id: string;
  trip_id: string;
  ride_reference: string | null;
  trip_reference: string | null;
  assignment: "mine" | "other" | "unassigned";
  kind: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  passenger_exit_confirmed_at: string | null;
};
type Result = {
  items: CaseRow[];
  page: number;
  total: number;
  page_size: number;
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
export function Cases() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  return session?.staff.permissions.includes("cases.read") ? (
    params.get("case") ? (
      <CaseDetail key={params.get("case")} id={params.get("case")!} />
    ) : (
      <CaseQueue />
    )
  ) : (
    <p>You do not have access to ride cases.</p>
  );
}
function CaseQueue() {
  const {session}=useAuth();
  const [params, setParams] = useSearchParams();
  const [version, setVersion] = useState(0);
  const [hidden, setHidden] = useState<string[]>([]);
  const columns = ['Issue', 'Status', 'Assignment', 'Created (IST)', 'Exit confirmed (IST)', 'Resolved (IST)'].map(label=>({key:label,label}));
  const query = new URLSearchParams();
  for (const key of ["page", "status", "kind", "assignment", "trip_reference", "ride_reference", "exit_review", "followup"])
    if (params.get(key)) query.set(key, params.get(key)!);
  const result = useRead<Result>(`/ride-cases?${query}`, version);
  const data = result?.data;

  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
  }
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ride cases</h1>
          <p className="text-sm text-slate-600">
            Support and dispute queue · Times in IST
          </p>
        </div>
        <Button variant="outline" disabled={!result} onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw size={16} className={!result?"animate-spin":""}/>
          Refresh cases
        </Button>
      </div>
      <Card className="gap-0 rounded-2xl py-0">
<div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><FilterBuilder fields={[{key:'trip_reference',label:'Trip reference',value:params.get('trip_reference')||'',maxLength:24,normalize:value=>value.trim().toUpperCase(),valid:value=>/^T0*[1-9][0-9]*$/.test(value)},{key:'ride_reference',label:'Ride reference',value:params.get('ride_reference')||'',maxLength:24,normalize:value=>value.trim().toUpperCase(),valid:value=>/^R0*[1-9][0-9]*$/.test(value)},{key:'followup',label:'Follow-up',value:params.get('followup')||'',options:['scheduled', 'overdue'].map(value=>({value,label:value.replaceAll('_',' ')}))},{key:'assignment',label:'Assignment',value:params.get('assignment')||'',options:['mine', 'unassigned', 'assigned'].map(value=>({value,label:value.replaceAll('_',' ')}))},{key:'status',label:'Status',value:params.get('status')||'',options:['open', 'waiting', 'resolved'].map(value=>({value,label:value.replaceAll('_',' ')}))},{key:'kind',label:'Issue type',value:params.get('kind')||'',options:['interrupted', 'safety', 'pickup_wait', 'late_pickup'].map(value=>({value,label:value.replaceAll('_',' ')}))},...(session?.staff.permissions.includes('cases.exit.manage')?[{key:'exit_review',label:'Exit review',value:params.get('exit_review')||'',options:[{value:'pending',label:'Undecided proposals'},{value:'independent',label:'Proposals by other staff'}]}]:[])]} onChange={values=>{setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/><ColumnPicker columns={columns} hidden={hidden} onChange={setHidden}/></div>
      {params.get('exit_review')&&<p className="rounded border bg-amber-50 p-3 text-sm">Showing cases with undecided exit proposals. These may need renewed passenger confirmation. Open the case to check the current journey and evidence before deciding; this queue does not establish approval eligibility.</p>}
      {!result && <div role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><RefreshCw size={16} className="animate-spin"/>Loading cases…</div>}
      {result?.error && (
        <p role="alert" className="p-6 text-destructive">
          {result.error}
        </p>
      )}
      {data && (
        <>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            {data.total} cases · Updated {time(data.generated_at)} IST
          </p>
          {data.items.length ? (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    {[
                      "Journey",
                      "Issue",
                      "Status",
                      "Assignment",
                      "Created (IST)",
                      "Exit confirmed (IST)",
                      "Resolved (IST)",
                    ].filter(t=>!hidden.includes(t)).map((t) => (
                      <th key={t} className="px-4 py-3 font-medium">
                        {t}
                      </th>
                    ))}
                    <th className="w-12"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/30">
                      <td className="p-4 align-top">
                        <Link
                          className="block font-semibold text-foreground hover:text-primary"
                          to={`/support?${new URLSearchParams({ ...Object.fromEntries(params), case: item.id })}`}
                        >
                          Inspect case
                        </Link>
                        <Link
                          className="mt-1 block text-xs text-muted-foreground hover:text-primary"
                          to={`/trips?kind=rides&id=${item.ride_request_id}`}
                        >
                          {item.ride_reference || "View ride"}
                        </Link>
                        <Link
                          className="text-xs text-muted-foreground hover:text-primary"
                          to={`/trips?kind=trips&id=${item.trip_id}`}
                        >
                          {item.trip_reference || "View trip"}
                        </Link>
                      </td>
                      {!hidden.includes('Issue')&&(<td className="p-4 align-top">
                        {(item.kind || "Not recorded").replaceAll("_", " ")}
                      </td>)}
                      {!hidden.includes('Status')&&(<td className="p-4 align-top">
                        <Badge variant="outline" className={item.status==='resolved'?'border-emerald-200 bg-emerald-50 text-emerald-800':item.status==='waiting'?'border-amber-200 bg-amber-50 text-amber-800':''}>{(item.status || "Not recorded").replaceAll("_", " ")}</Badge>
                      </td>)}
                      {!hidden.includes('Assignment')&&(<td className="p-4 align-top">{item.assignment === "mine" ? "Assigned to you" : item.assignment === "other" ? "Assigned to another staff member" : item.assignment === "unassigned" ? "Unassigned" : "Not available"}</td>)}
                      {!hidden.includes('Created (IST)')&&(<td className="p-4 align-top">{time(item.created_at)}</td>)}
                      {!hidden.includes('Exit confirmed (IST)')&&(<td className="p-4 align-top">
                        {time(item.passenger_exit_confirmed_at)}
                      </td>)}
                      {!hidden.includes('Resolved (IST)')&&(<td className="p-4 align-top">{time(item.resolved_at)}</td>)}
                      <td className="p-3 align-top"><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${item.ride_reference||'case'}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p><DropdownMenuItem render={<Link to={`/support?${new URLSearchParams({...Object.fromEntries(params),case:item.id})}`}/>}>Open case<ArrowUpRight size={14}/></DropdownMenuItem>{session?.staff.permissions.includes('journeys.read')&&<><DropdownMenuItem render={<Link to={`/trips?kind=rides&id=${item.ride_request_id}`}/>}>View ride</DropdownMenuItem><DropdownMenuItem render={<Link to={`/trips?kind=trips&id=${item.trip_id}`}/>}>View trip</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 rounded-full bg-muted p-4"><Inbox size={24} className="text-muted-foreground"/></div><h2 className="font-semibold">No ride cases found</h2><p className="mt-2 text-sm text-muted-foreground">No cases match these filters.</p><p className="mt-1 text-sm text-muted-foreground">Adjust your search or filters to review other cases.</p>{Array.from(query).some(([key,value])=>key!=='page'&&Boolean(value.trim()))&&<Button variant="outline" className="mt-5" onClick={()=>{setParams({});}}>Clear all filters</Button>}</div>
          )}
          <div className="flex items-center justify-end gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
            <Button
              variant="outline"
              disabled={data.page <= 1}
              onClick={() => page(data.page - 1)}
            >
              Previous
            </Button>
            <span>Page {data.page}</span>
            <Button
              variant="outline"
              disabled={data.page * data.page_size >= data.total}
              onClick={() => page(data.page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
      </Card>
      <details className="group text-sm text-muted-foreground"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Info size={15}/>About case reviews<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary><p className="mt-3 max-w-4xl leading-relaxed">Review cases, assignment and related journeys. Open a case to access permitted evidence and permitted resolution actions. Missing GPS alone does not establish a no-show or justify ending a journey.</p></details>
    </section>
  );
}
