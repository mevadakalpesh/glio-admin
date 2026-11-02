import {FilterBuilder} from "@/components/ui/filter-builder";
import {ColumnPicker} from '@/components/ui/column-picker';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {MoreHorizontal, Info, ChevronRight} from 'lucide-react';
import type {BusinessSummary} from './BusinessOverview';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import {OverviewDashboard} from './OverviewDashboard';
import {NativeSelect} from '@/components/ui/native-select';
import {PersonOverview} from "./PersonOverview";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
const title = (value: string | null) =>
  value
    ? value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^./, (c) => c.toUpperCase())
    : "Not recorded";
const time = (value: string) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date)
    : "Not recorded";
};
const input = "w-full rounded-lg border bg-white px-3 py-2 text-sm";
type Bucket = { status: number; label: string; count: number };
type Snapshot = {
  business?:BusinessSummary|null;
  trips: Bucket[];
  rides: Bucket[];
  generated_at: string;
  scope: string;
  states?: {code:string;name:string}[];
  date_basis?: string;
};
type Person = {
  id: string;
  name: string;
  avatar_url?: string | null;
  phone_masked: string;
  email_masked: string;
  role: string;
  is_active: boolean | null;
  new_journeys_restricted?: boolean | null;
  account_status: string | null;
  created_at: string;
  updated_at: string;
};
type PeopleList = { items: Person[]; total: number; page: number };
type PersonDetail = {
  person: Person;
  journeys: { trips: number; rides: number };
  generated_at: string;
};
function Denied() {
  return (
    <Card>
      <CardContent className="p-6">
        Your role does not include this view. Contact an owner for access.
      </CardContent>
    </Card>
  );
}
export function OperationsOverview() {
  const { session } = useAuth();
  return session?.staff.permissions.includes("overview.read") ? (
    <SnapshotView key={`${session.staff.id}:${session.staff.role}:${session.staff.assigned_states?.join(",")}`} />
  ) : (
    <Denied />
  );
}
function SnapshotView() {
  const [version, setVersion] = useState(0);
  const [params, setParams] = useSearchParams();
  const filters = new URLSearchParams();
  for (const key of ["from", "to", "state"]) if (params.get(key)) filters.set(key, params.get(key)!);
  const result = useRead<Snapshot>(`/overview${filters.size ? `?${filters}` : ""}`, version);
  const journeyLink = (kind: string, status?: number) => {
    const query = new URLSearchParams({kind});
    if (status !== undefined) query.set("status", String(status));
    filters.forEach((value,key) => query.set(key,value));
    return `/trips?${query}`;
  };
  return (
    <>
      <form className="mb-5 flex flex-wrap items-center gap-2" onSubmit={event => {
        event.preventDefault();
        const form = new FormData(event.currentTarget), next = new URLSearchParams();
        for (const key of ["from","to","state"]) { const value=String(form.get(key)||""); if(value)next.set(key,value); }
        setParams(next);
      }}>
        <h1 className="mr-auto text-3xl font-semibold">Dashboard</h1>
        <DateRangeFilter key={`${params.get("from")}:${params.get("to")}`} from={params.get("from")||""} to={params.get("to")||""}/>
        <label className="min-w-0 text-sm"><span className="sr-only">State (both endpoints)</span><NativeSelect key={`${params.get("state")}:${result?.data?.states?.length}`} name="state" defaultValue={params.get("state")||""} className={input}>
          <option value="">All accessible regions</option>
          {params.get("state") && !result?.data?.states?.some(state=>state.code===params.get("state")) && <option value={params.get("state")!}>{params.get("state")}</option>}
          {result?.data?.states?.map(state=><option key={state.code} value={state.code}>{state.name}</option>)}
        </NativeSelect></label>
        <Button type="submit" aria-label="Apply overview filters">Apply</Button><Button type="button" variant="outline" onClick={()=>setVersion(v=>v+1)} aria-label="Refresh dashboard"><RefreshCw size={15}/></Button>
        {filters.size > 0 && <Button type="button" variant="ghost" onClick={()=>setParams({})}>Clear overview filters</Button>}
        
      </form>
      {!result && (
        <p role="status" className="rounded-lg border bg-white p-8">
          Loading overview…
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-5 text-red-800">
          {result.error}
        </p>
      )}
      {result?.data && (
        <>
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={15} />
            {result.data.scope} · Updated {time(result.data.generated_at)} IST
          </div>
          <OverviewDashboard business={result.data.business} trips={result.data.trips} rides={result.data.rides} state={params.get("state")||""} version={version} journeyLink={journeyLink}/>
          <details className="mt-5 text-xs leading-5 text-slate-500"><summary className="cursor-pointer">About dashboard data</summary><p>
            These are database status counts, not live GPS activity, conversion
            rates or revenue. A payment-pending status alone does not establish
            whether money was debited. Money and dispute workflows remain
            separate.
          </p></details>
        </>
      )}
    </>
  );
}
export function People() {
  const { session } = useAuth();
  return session?.staff.permissions.includes("people.read") ? (
    <PeopleBrowser />
  ) : (
    <Denied />
  );
}
function PeopleBrowser() {
  const [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0);
  const [hidden,setHidden]=useState<string[]>([]);
  const columns=['Contact','Recorded state','Joined (IST)'].map(label=>({key:label,label}));
  const id = params.get("id");
  const query = new URLSearchParams();
  for (const field of ["search", "state", "page"])
    if (params.get(field)) query.set(field, params.get(field)!);
  const result = useRead<PeopleList | PersonDetail>(
    id ? `/people/${encodeURIComponent(id)}` : `/people?${query}`,
    version,
  );
  const list = result?.data && "items" in result.data ? result.data : null;
  const detail = result?.data && "person" in result.data ? result.data : null;
  const update = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next);
  };
  return (
    <>
      <div className="mb-6 flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {id ? "Account details" : "People"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {id ? "Customer profile, journey history and account access" : "Customer accounts · masked contacts"}
          </p>
        </div>
        <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>
      <div className={!id?"overflow-hidden rounded-2xl border bg-card":""}>
      {id ? (
        <Button
          className="mb-5"
          variant="ghost"
          onClick={() => update({ id: null })}
        >
          <ArrowLeft size={16} />
          Back to people
        </Button>
      ) : (
        <div className="border-b">
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><FilterBuilder fields={[
              {key:'search',label:'Name or account ID',operator:'matches',value:params.get('search')||'',maxLength:80},
              {key:'state',label:'Account state',value:params.get('state')||'',options:['active','suspended','banned','deleted','pending_kyc'].map(value=>({value,label:title(value)}))}
            ]} onChange={values=>{setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/><ColumnPicker columns={columns} hidden={hidden} onChange={setHidden}/></div>
          </div>
        </div>
      )}
      {!result && (
        <p role="status" className="rounded-lg border bg-white p-8">
          Loading {id ? "account" : "people"}…
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-5 text-red-800">
          {result.error}
        </p>
      )}
      {list && (
        <>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Person",
                      "Contact",
                      "Recorded state",
                      "Joined (IST)",
                      "",
                    ].filter(h=>!hidden.includes(h)).map((h, i) => (
                      <th key={i} className="p-4 font-medium">
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((person) => (
                    <tr key={person.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{person.name?.split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join('').toUpperCase()||'?'}</span>{person.name}</div></td>
                      {!hidden.includes('Contact')&&(<td className="p-4">
                        <p>{person.phone_masked}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {person.email_masked}
                        </p>
                      </td>)}
                      {!hidden.includes('Recorded state')&&(<td className="p-4">
                        <Badge variant="outline" className={person.account_status==='active'?'border-emerald-200 bg-emerald-50 text-emerald-800':person.account_status==='banned'||person.account_status==='suspended'?'border-red-200 bg-red-50 text-red-800':''}>
                          {title(person.account_status)}
                        </Badge>
                        {person.new_journeys_restricted === true && <p className="mt-1 text-xs text-amber-800">New journeys restricted</p>}
                        {person.is_active === false && (
                          <p className="mt-1 text-xs text-red-700">
                            Access disabled
                          </p>
                        )}
                      </td>)}
                      {!hidden.includes('Joined (IST)')&&(<td className="whitespace-nowrap p-4">
                        {time(person.created_at)}
                      </td>)}
                      <td className="w-14 p-4"><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${person.name}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p><DropdownMenuItem onClick={()=>update({id:person.id})}>View account<ArrowRight size={14}/></DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!list.items.length && (
                <div className="px-6 py-16 text-center">
                  <Users className="mx-auto mb-3 text-slate-400" />
                  <h2 className="font-semibold">No people found</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another name or account state.
                  </p>
                </div>
              )}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <Button
              variant="outline"
              disabled={list.page === 1}
              onClick={() => update({ page: String(list.page - 1) })}
            >
              Previous
            </Button>
            <span className="text-xs text-slate-500">
              Page {list.page} · {list.total} accounts
            </span>
            <Button
              variant="outline"
              disabled={list.page * 25 >= list.total}
              onClick={() => update({ page: String(list.page + 1) })}
            >
              Next
            </Button>
          </div>
        </>
      )}
      </div>
      {!id&&<details className="group mt-5 text-sm text-muted-foreground"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Info size={15}/>About customer accounts<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary><p className="mt-3 max-w-4xl leading-relaxed">Includes all customer accounts. Use linked journeys to inspect ride participation; account role alone does not prove ride activity.</p></details>}
      {detail && <PersonOverview key={detail.person.id} detail={detail} onRefresh={()=>setVersion(v=>v+1)}/>}
    </>
  );
}
