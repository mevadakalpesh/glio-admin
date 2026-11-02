import {AdminTable} from '@/components/ui/admin-table';
import {FilterBuilder} from '@/components/ui/filter-builder';
import {Dialog, DialogContent, DialogTitle, DialogDescription} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {RefreshCw, MoreHorizontal, Bell, Info} from 'lucide-react';
import {DateRangeFilter} from '@/components/ui/date-range-filter';

import { NotificationInspection } from "./NotificationInspection";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
import { Button } from "@/components/ui/button";
type Row = {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
};
type Result = {
  items: Row[];
  page: number;
  page_size: number;
  total: number;
  generated_at: string;
  reference?: string | null;
};
const time = (v: string | null) =>
  v && Number.isFinite(Date.parse(v))
    ? new Date(v).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";
export function NotificationDelivery() {
  const { session } = useAuth();
  return session?.staff.permissions.includes("notifications.delivery.read") ? (
    <DeliveryQueue />
  ) : (
    <p>You do not have access to notification delivery.</p>
  );
}
function DeliveryQueue() {
  const { session } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0);
  const query = new URLSearchParams();
  for (const key of ["page", "status", "reference", "from", "to", "retry"])
    if (params.get(key)) query.set(key, params.get(key)!);
  const result = useRead<Result>(`/notification-delivery?${query}`, version),
    data = result?.data;
  function page(n: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(n));
    setParams(next);
  }
  function updateFilters(values: Record<string,string>) {
    setSelected(null);
    setParams(previous => {
      const next = new URLSearchParams(previous); next.delete('page');
      for(const [key,value] of Object.entries(values)) {if(value) next.set(key,value); else next.delete(key);}
      return next;
    });
  }
  const toolbar = <FilterBuilder fields={[
    {key:'reference',label:'Ride or trip reference',value:params.get('reference')||'',maxLength:24,normalize:value=>value.trim().toUpperCase(),valid:value=>/^[RT]0*[1-9][0-9]*$/.test(value)},
    {key:'status',label:'Recorded status',value:params.get('status')||'',options:['queued','skipped','failed','sent','delivered','read'].map(value=>({value,label:value[0].toUpperCase()+value.slice(1)}))},
    {key:'retry',label:'Retry state',value:params.get('retry')||'',options:[{value:'eligible',label:'Eligible for automatic retry'},{value:'exhausted',label:'Retries exhausted'}]},
  ]} onChange={updateFilters} hasExtraFilters={Boolean(params.get('from')||params.get('to'))} onClear={()=>updateFilters({reference:'',status:'',retry:'',from:'',to:''})}>
    <DateRangeFilter key={`${params.get('from')}:${params.get('to')}`} from={params.get('from')||''} to={params.get('to')||''} label="Notification date range (IST)" onChange={updateFilters}/>
  </FilterBuilder>;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-semibold">Notification delivery</h1><p className="mt-2 text-sm text-muted-foreground">Journey, support and document updates · Times in IST</p></div>
        <Button variant="outline" onClick={() => setVersion((v) => v + 1)}><RefreshCw size={16}/>Refresh delivery</Button>
      </div>
      <Dialog open={Boolean(selected)} onOpenChange={open=>{if(!open)setSelected(null);}}>
        <DialogContent className="max-w-2xl"><DialogTitle className="pr-8 text-xl font-semibold">Notification inspection</DialogTitle><DialogDescription className="mt-2 break-all text-sm text-muted-foreground">Event {selected}</DialogDescription>{selected&&<div className="mt-5"><NotificationInspection key={selected} id={selected}/></div>}</DialogContent>
      </Dialog>
      <div className="overflow-hidden rounded-2xl border bg-card">
      {!result && <p role="status">Loading delivery records…</p>}
      {result?.error && (
        <p role="alert" className="text-red-800">
          {result.error}
        </p>
      )}
      <>
          {data && <p className="border-b px-4 py-3 text-xs text-muted-foreground">
            {data.reference ? `${data.reference} · ` : ""}
            {data.total} matching records · Updated {time(data.generated_at)}{" "}
            IST
          </p>}
          <AdminTable className="w-full text-left text-sm" toolbar={toolbar}>
                <caption className="sr-only">
                  Journey, support and review delivery records, all times in IST
                </caption>
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Journey",
                      "Recorded status",
                      "Created (IST)",
                      "Last updated (IST)",
                      "Sent (IST)",
                      "Delivered (IST)",
                      "Read (IST)",
                      "Actions",
                    ].map((label) => (
                      <th key={label} className="p-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3">
                        {row.entity_id &&
                        ["ride_request", "trip"].includes(
                          row.entity_type || "",
                        ) ? (
                          <Link
                            className="text-emerald-800 underline"
                            to={`/trips?kind=${row.entity_type === "trip" ? "trips" : "rides"}&id=${encodeURIComponent(row.entity_id)}`}
                          >
                            View {row.entity_type === "trip" ? "trip" : "ride"}
                          </Link>
                        ) : (
                          row.entity_type === "support_ticket" ? "Support update" : row.entity_type === "verification" ? "Document review" : "Journey unavailable"
                        )}
                      </td>
                      <td
                        className={`p-3 font-medium ${row.status === "failed" ? "text-red-800" : "text-slate-800"}`}
                      >
                        {row.status}

                      </td>
                      {[
                        row.created_at,
                        row.updated_at,
                        row.sent_at,
                        row.delivered_at,
                        row.read_at,
                      ].map((value, index) => (
                        <td key={index} className="p-3">
                          {time(value)}
                        </td>
                      ))}
                      <td className="p-3">{session?.staff.permissions.includes('notifications.delivery.inspect')&&<DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for notification ${row.id}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setSelected(row.id)}><Info size={14}/>Inspect notification</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
          {data && !data.items.length && <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center"><div className="rounded-full bg-muted p-4"><Bell size={24} className="text-muted-foreground"/></div><h2 className="font-semibold">No matching notification records.</h2><p className="text-sm text-muted-foreground">Notifications will appear here when recorded. Try adjusting your filters.</p></div>}
          {data && <div className="flex items-center justify-end gap-3 border-t p-4">
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
          </div>}
      </>
      </div>
      <details className="rounded-xl border p-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">About delivery records</summary><div className="mt-3 space-y-2"><p>Sent does not prove device delivery or that the recipient read the message. Missing timestamps mean no confirmation is recorded. Message content, recipients and provider errors are restricted.</p><p>Dates filter record creation, including the entire end date in India time. Retry filters reflect recorded worker eligibility, not worker health or a promised retry time.</p></div></details>
    </section>
  );
}
