import {TripSignals} from './TripSignals';
import {formatJourneyDuration} from './journeyPresentation';
import {TripSummary} from './TripSummary';
import {FilterBuilder} from "@/components/ui/filter-builder";
import { SegmentedControl, SegmentedItem } from "@/components/ui/segmented-control";
import {MapPin,Clock,Users,Armchair,IndianRupee} from 'lucide-react';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {MoreHorizontal,ArrowUpDown,ArrowUp,ArrowDown,Eye} from 'lucide-react';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import {ColumnPicker} from '@/components/ui/column-picker';
import {CaseIntake} from "./CaseIntake";
import {TripOperations,type TripOperationsData} from "./TripOperations";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Route,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useRead } from "./useRead";
import { useAuth } from "./useAuth";
type Journey = {
  id: string;
  reference: string;
  status_label: string;
  origin: { city?: string; state?: string } | null;
  destination: { city?: string; state?: string } | null;
  departure_at?: string;
  ride_date?: string;
  ride_time?: string;
  scheduled_pickup_at?: string;
  distance_km?: string;
  estimated_eta_hours?: string;
  route_duration_minutes?: number;
  route_distance_km?: string;
  available_seats?: number;
  seats_booked?: number;
  passenger_count?: number;
  trip_started_at?: string;
  trip_completed_at?: string;
  cancelled_at?: string;
  created_at: string;
  updated_at: string;
  estimated_min_amount?: string;
  estimated_max_amount?: string;
  final_amount?: string;
  escrow_status?: string;
  payment_confirmed_at?: string;
};
type Listing = {
  items: Journey[];
  total: number;
  page: number;
  statuses: { value: string; label: string }[];
  date_filter: string;
};
type Detail = {
  journey: Journey;
  operations?: TripOperationsData;
  participants?:Record<string,{id:string;name:string}|null>;
  history: {
    items: {
      id: string;
      action: string;
      created_at: string;
      from_status: string | null;
      to_status: string | null;
    }[];
    total: number;
    page: number;
  };
};
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
const time = (value?: string | null) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date);
};
const place = (value: Journey["origin"]) =>
  [value?.city, value?.state].filter(Boolean).join(", ") || "Area not recorded";
const money = (value?: string | null) =>
  value != null && value !== "" && Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(value))
    : "Not recorded";
export function Journeys() {
  const { session } = useAuth();
  if (!session?.staff.permissions.includes("journeys.read"))
    return (
      <Card>
        <CardContent className="p-6">
          Your role does not include journey inspection. Contact an owner for
          access.
        </CardContent>
      </Card>
    );
  return <JourneyBrowser />;
}
function JourneyBrowser() {
  const {session}=useAuth();

  const [hiddenColumns,setHiddenColumns]=useState<string[]>([]);

  const [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0);
  const kind = params.get("kind") === "rides" ? "rides" : "trips",
    id = params.get("id");
  const query = new URLSearchParams();
  for (const field of ["reference", "status", "from", "to", "page", "person", "state", "sort", "direction"])
    if (params.get(field)) query.set(field, params.get(field)!);
  const path = id
    ? `/journeys/${kind}/${encodeURIComponent(id)}?activity_page=${encodeURIComponent(params.get("activity_page") || "1")}&linked_page=${encodeURIComponent(params.get("linked_page")||"1")}`
    : `/journeys/${kind}?${query}`;
  const result = useRead<Listing | Detail>(path, version);
  const data = result?.data;
  const update = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(values)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setParams(next);
  };
  const listing = data && "items" in data ? data : null,
    detail = data && "journey" in data ? data : null;
  const detailTab = ['overview','passengers','timeline','payout','activity'].includes(params.get('tab') || '') ? params.get('tab')! : 'overview';
  const page = listing?.page || detail?.history.page || 1,
    total = listing?.total || detail?.history.total || 0;
  return (
    <>
      {params.get("state") && <p className="mb-4 rounded-lg border bg-emerald-50 p-3 text-sm">State filter: {params.get("state")} · both endpoints. <button className="underline" onClick={()=>update({state:null,page:null})}>Clear state filter</button></p>}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-emerald-700">
            <ShieldCheck size={15} />
            Read-only operations
          </div>
          <h1 className="text-3xl font-semibold">
            {id ? `${kind === "trips" ? "Trip" : "Ride"} ${detail?.journey.reference || "details"}` : "Trips & rides"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {id
              ? "Recorded journey state and activity. Times are shown in IST."
              : "Find journeys by reference, status or scheduled date."}
          </p>
        </div>
        <Button variant="outline" onClick={() => setVersion((v) => v + 1)}>
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>
      {id ? (
        <Button
          variant="ghost"
          className="mb-5"
          onClick={() => update({ id: null, activity_page: null, linked_page:null })}
        >
          <ArrowLeft size={16} />
          Back to {kind}
        </Button>
      ) : (
        <>
          {params.get("person") && (
            <p className="mb-4 text-sm text-emerald-800">
              Filtered to account {params.get("person")} ·{" "}
              <Link
                className="underline"
                to={`/people?id=${params.get("person")}`}
              >
                View account
              </Link>
            </p>
          )}
          <SegmentedControl aria-label="Journey type" className="mb-5">
            {(["trips", "rides"] as const).map((type) => (
              <SegmentedItem
                key={type}
                
                aria-pressed={kind === type}
                onClick={() =>
                  setParams(
                    params.get("person")
                      ? { kind: type, person: params.get("person")! }
                      : { kind: type },
                  )
                }
              >
                {type === "trips" ? "Traveler trips" : "Passenger rides"}
              </SegmentedItem>
            ))}
          </SegmentedControl>
          <Card className="mb-5">
            <CardContent className="p-3">
<div className="flex flex-wrap items-center gap-2"><FilterBuilder hasExtraFilters={Boolean(params.get('from')||params.get('to'))} onClear={()=>setParams({kind})} fields={[
    {key:'reference',label:'Reference',value:params.get('reference')||'',maxLength:20,normalize:value=>value.trim().toUpperCase()},
    {key:'status',label:'Status',value:params.get('status')||'',options:listing?.statuses.map(s=>({value:String(s.value),label:label(s.label)}))||[]},
    {key:'person',label:'Account ID',value:params.get('person')||''}
  ]} onChange={values=>{setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/>
  <DateRangeFilter key={`${params.get('from')}:${params.get('to')}`} from={params.get('from')||''} to={params.get('to')||''} onChange={range=>update({from:range.from||null,to:range.to||null,page:null})}/>
  <ColumnPicker columns={[{key:'Route area',label:'Route area'},{key:'Scheduled (IST)',label:'Scheduled (IST)'},{key:'Status',label:'Status'}]} hidden={hiddenColumns} onChange={setHiddenColumns}/></div>
              <p className="mt-3 text-xs text-slate-500">
                {kind === "trips"
                  ? "Includes passenger-only and mixed trips; package-only trips are excluded. Date filters use scheduled departure."
                  : "Date filters use the rider’s requested date."}
              </p>
            </CardContent>
          </Card>
        </>
      )}
      {result?.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
        >
          {result.error}
          <p className="mt-2">Adjust the filters or refresh to try again.</p>
        </div>
      )}
      {!result && (
        <p
          role="status"
          className="rounded-lg border bg-white p-8 text-slate-500"
        >
          Loading {id ? "journey" : "journeys"}…
        </p>
      )}
      {listing && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-500">
                <tr>
                  {[
                    "Reference",
                    "Route area",
                    "Scheduled (IST)",
                    "Status",
                    "",
                  ].filter(h=>!hiddenColumns.includes(h)).map((h, i) => (
                    <th key={h||i} className="p-4 font-medium" aria-sort={params.get('sort')===({Reference:'reference','Scheduled (IST)':'scheduled',Status:'status'} as Record<string,string>)[h]?(params.get('direction')==='asc'?'ascending':'descending'):undefined}>
                      {['Reference','Scheduled (IST)','Status'].includes(h)?<Button type="button" variant="ghost" className="-ml-3 h-8 gap-2 text-xs" aria-label={`Sort by ${h}`} onClick={()=>{const sort=({Reference:'reference','Scheduled (IST)':'scheduled',Status:'status'} as Record<string,string>)[h];update({sort,direction:params.get('sort')===sort&&params.get('direction')==='asc'?'desc':'asc',page:null});}}>{h}{params.get('sort')===({Reference:'reference','Scheduled (IST)':'scheduled',Status:'status'} as Record<string,string>)[h]?(params.get('direction')==='asc'?<ArrowUp size={14}/>:<ArrowDown size={14}/>):<ArrowUpDown size={14}/>}</Button>:h||<span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listing.items.map((j) => (
                  <tr key={j.id} className="border-b last:border-0">
                    <td className="p-4 font-semibold">{j.reference}</td>
                    {!hiddenColumns.includes("Route area")&&<td className="min-w-48 p-4">
                      <p>{place(j.origin)}</p>
                      <p className="mt-1 text-slate-500">
                        → {place(j.destination)}
                      </p>
                    </td>}
                    {!hiddenColumns.includes("Scheduled (IST)")&&<td className="whitespace-nowrap p-4">
                      {time(
                        j.departure_at ||
                          (j.ride_date && j.ride_time
                            ? `${j.ride_date}T${j.ride_time}+05:30`
                            : null),
                      )}
                    </td>}
                    {!hiddenColumns.includes("Status")&&<td className="p-4">
                      <Badge variant="secondary">{label(j.status_label)}</Badge>
                    </td>}
                    <td className="p-4">
                      <DropdownMenu><DropdownMenuTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Actions for ${j.reference}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p><DropdownMenuItem onClick={()=>update({id:j.id,activity_page:null,linked_page:null})}><Eye size={16}/>View {j.reference}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!listing.items.length && (
              <div className="p-10 text-center">
                <Route className="mx-auto mb-3 text-slate-400" />
                <h2 className="font-semibold">No journeys found</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Try a different reference or broaden the filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {detail && (
        <>
          {kind==='trips'&&<div className="mb-5 flex flex-wrap items-center justify-between gap-3"><SegmentedControl aria-label="Trip detail sections">{[['overview','Overview'],['passengers','Passenger rides'],['timeline','Timeline'],['payout','Potential payout'],['activity','Activity']].map(([value,title])=><SegmentedItem key={value} aria-pressed={detailTab===value} onClick={()=>update({tab:value})}>{title}</SegmentedItem>)}</SegmentedControl>{session?.staff.permissions.includes('cases.read')&&<Button variant="outline" render={<Link to={`/support?trip_reference=${encodeURIComponent(detail.journey.reference)}`}/>}>Support & issues</Button>}</div>}
          {kind==='trips'&&detailTab==='overview'&&<TripSignals data={detail.operations}/>}
          {(kind!=='trips'||detailTab==='overview')&&<div className="mb-6 grid items-start gap-6 xl:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
              <div className="flex items-center justify-between border-b bg-emerald-50/60 p-5"><div className="flex items-center gap-2 font-semibold"><Route size={19} className="text-emerald-700"/>Journey route</div><Badge variant="secondary">{label(detail.journey.status_label)}</Badge></div>
              <CardContent className="p-6">
                <div className="relative space-y-10 border-l-2 border-dashed border-slate-200 pl-6">
                  <div><span className="absolute -left-2 top-1 size-3.5 rounded-full border-2 border-white bg-emerald-600"/><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kind==='trips'?'Start':'Pickup'}</p><h2 className="mt-2 text-lg font-semibold">{place(detail.journey.origin)}</h2></div>
                  <div><span className="absolute -left-2 bottom-10 size-3.5 rounded-full border-2 border-white bg-orange-500"/><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kind==='trips'?'Destination':'Drop-off'}</p><h2 className="mt-2 text-lg font-semibold">{place(detail.journey.destination)}</h2></div>
                </div>
                <div className="mt-6 rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Scheduled / requested · IST</p><p className="mt-1 text-sm font-medium">{time(detail.journey.departure_at||(detail.journey.ride_date&&detail.journey.ride_time?`${detail.journey.ride_date}T${detail.journey.ride_time}+05:30`:null))}</p></div>
                <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Area-level locations only. Exact addresses, contact details, identity documents and pickup codes are not included.</p>
              </CardContent>
              <div className="border-t px-6 py-4 text-xs text-muted-foreground">Reference <strong className="float-right text-foreground">{detail.journey.reference}</strong></div>
            </Card>
            <div className="min-w-0 space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {[
                  {name:'Distance',icon:MapPin,value:(detail.journey.distance_km??detail.journey.route_distance_km)!=null?`${detail.journey.distance_km??detail.journey.route_distance_km} km`:'Not recorded'},
                  {name:'Estimated duration',icon:Clock,value:kind==='trips'?(detail.journey.estimated_eta_hours!=null?formatJourneyDuration(detail.journey.estimated_eta_hours, true):'Not recorded'):(detail.journey.route_duration_minutes!=null?formatJourneyDuration(detail.journey.route_duration_minutes):'Not recorded')},
                  {name:kind==='trips'?'Seat capacity':'Passengers',icon:Users,value:(kind==='trips'?detail.journey.available_seats:detail.journey.passenger_count)??'Not recorded'},
                  {name:kind==='trips'?'Seats booked':'Final fare',icon:kind==='trips'?Armchair:IndianRupee,value:kind==='trips'?(detail.journey.seats_booked??'Not recorded'):money(detail.journey.final_amount)}
                ].map(item=><Card key={item.name} className="gap-0 bg-muted/30 py-0 shadow-none"><CardContent className="flex items-start gap-3 p-4"><item.icon size={20} className="mt-1 shrink-0 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">{item.name}</p><p className="mt-2 text-lg font-semibold">{item.value}</p></div></CardContent></Card>)}
              </div>
              {kind==='trips'?<Card className="gap-0 py-0 shadow-none"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Pickup service</p><p className="mt-2 text-lg font-semibold capitalize">{detail.operations?.delivery_mode?.replaceAll('_',' ')||'Not recorded'}</p><p className="mt-3 text-xs text-muted-foreground">Last updated {time(detail.journey.updated_at)} IST</p></CardContent></Card>:<Card className="gap-0 py-0 shadow-none"><div className="border-b px-6 py-4"><h2 className="font-semibold">Journey information</h2><p className="mt-1 text-xs text-muted-foreground">Recorded details and lifecycle timestamps · IST</p></div><CardContent className="p-6">
              <dl className="grid gap-x-6 sm:grid-cols-2">

                {Object.entries({
                  "Scheduled / requested": time(
                    detail.journey.departure_at ||
                      (detail.journey.ride_date && detail.journey.ride_time
                        ? `${detail.journey.ride_date}T${detail.journey.ride_time}+05:30`
                        : null),
                  ),
                  Distance:
                    (detail.journey.distance_km ??
                      detail.journey.route_distance_km) != null
                      ? `${detail.journey.distance_km ?? detail.journey.route_distance_km} km`
                      : "Not recorded",
                  ...({
                        "Estimated duration":
                          detail.journey.route_duration_minutes != null
                            ? formatJourneyDuration(detail.journey.route_duration_minutes)
                            : "Not recorded",
                        Passengers:
                          detail.journey.passenger_count ?? "Not recorded",
                        "Estimated fare range": `${money(detail.journey.estimated_min_amount)} – ${money(detail.journey.estimated_max_amount)}`,
                        "Final fare": money(detail.journey.final_amount),
                        "Payment confirmed": time(
                          detail.journey.payment_confirmed_at,
                        ),
                        "Escrow state": detail.journey.escrow_status
                          ? label(detail.journey.escrow_status)
                          : "Not recorded",
                        "Scheduled pickup": time(
                          detail.journey.scheduled_pickup_at,
                        ),
                      }),
                  Cancelled: time(detail.journey.cancelled_at),
                  Created: time(detail.journey.created_at),
                  "Last updated": time(detail.journey.updated_at),
                }).filter(([key])=>!["Scheduled / requested","Distance","Estimated duration","Seat capacity","Seats booked","Passengers","Final fare"].includes(key)).map(([k, v]) => (
                  <div key={k} className="border-b py-3 last:border-0">
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="mt-1 text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>}
            </div>
          </div>
          }
          {kind==="rides"&&detail.participants&&<Card className="mb-6"><CardContent className="grid gap-4 p-6 sm:grid-cols-2">{Object.entries(detail.participants).map(([role,person])=><div key={role}><p className="text-xs capitalize text-muted-foreground">{role==='passenger'?'Rider':role}</p><p className="mt-1 font-medium">{person?.name||'Not assigned'}</p>{person&&session?.staff.permissions.includes('people.read')&&<Link className="text-sm text-emerald-700 underline" to={`/people?id=${encodeURIComponent(person.id)}`}>View account details</Link>}</div>)}</CardContent></Card>}
          {kind==="rides"&&id&&<CaseIntake key={id} rideId={id}/>}
          {kind==="trips"&&(detailTab==="timeline"||detailTab==="payout")&&<TripSummary journey={detail.journey} operations={detail.operations} section={detailTab}/>}
          {kind==="trips"&&id&&(detailTab==="overview"||detailTab==="passengers")&&<TripOperations section={detailTab} key={id} id={id} status={detail.journey.status_label} data={detail.operations} onPage={page=>update({linked_page:String(page)})}/>}
          {kind==='rides'&&session?.staff.permissions.includes('cases.read')&&detail.journey.reference&&<Link className="mb-4 inline-block text-emerald-700 underline" to={`/support?${new URLSearchParams({ride_reference:detail.journey.reference})}`}>Review journey cases</Link>}
          {(kind!=="trips"||detailTab==="activity")&&<Card>
            <CardContent className="p-6">
              <h2 className="mb-5 text-lg font-semibold">Activity history</h2>
              <p className="mb-4 text-xs text-slate-500">
                Newest first. Events reflect stored activity, not an inferred
                timeline. Free-text evidence and internal metadata are excluded.
              </p>
              {detail.history.items.length ? (
                <ol className="space-y-5">
                  {detail.history.items.map((event) => (
                    <li
                      key={event.id}
                      className="border-l-2 border-emerald-200 pl-4"
                    >
                      <p className="text-sm font-medium">
                        {label(event.action)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {time(event.created_at)}
                      </p>
                      {event.to_status && (
                        <p className="mt-2 text-xs">
                          {event.from_status
                            ? label(event.from_status) + " → "
                            : ""}
                          {label(event.to_status)}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">No recorded activity.</p>
              )}
            </CardContent>
          </Card>}
        </>
      )}
      {data && (!id || kind!=="trips" || detailTab==="activity") && (
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              update({ [id ? "activity_page" : "page"]: String(page - 1) })
            }
          >
            Previous
          </Button>
          <span className="text-xs text-slate-500">
            Page {page} · {total} {id ? "events" : "journeys"}
          </span>
          <Button
            variant="outline"
            disabled={page * 25 >= total}
            onClick={() =>
              update({ [id ? "activity_page" : "page"]: String(page + 1) })
            }
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
}
