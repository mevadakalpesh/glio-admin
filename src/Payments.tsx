import {FilterBuilder} from "@/components/ui/filter-builder";
import {RefreshCw, MoreHorizontal, Info, ChevronRight, CreditCard} from 'lucide-react';
import {ColumnPicker} from '@/components/ui/column-picker';
import {Badge} from '@/components/ui/badge';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import { PaymentInspection } from "./PaymentInspection";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useRead } from "./useRead";
import { Button } from "@/components/ui/button";
type Row = {
  id: string;
  ride_id: string | null;
  state: string;
  refund_status?: string;
  environment: string;
  amount: string | null;
  paid_at: string | null;
  checked_at: string | null;
  created_at: string | null;
};
type Result = {
  items: Row[];
  total: number;
  page: number;
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
export function Payments() {
  const { session } = useAuth();
  return session?.staff.permissions.includes("payments.read") ? (
    <><nav className="mb-5 flex flex-wrap gap-2"><Link className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" to="/payments/review">Payment consistency review</Link><Link className="inline-flex rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" to="/reports/payment-aging">Recorded payment aging</Link></nav><PaymentQueue /></>
  ) : (
    <p>You do not have access to payment records.</p>
  );
}
function PaymentQueue() {
  const { session } = useAuth();
  const [hidden,setHidden]=useState<string[]>([]);
  const columns=['Environment','Recorded state','Recorded refund','Order amount','Created (IST)','Paid (IST)','Last recorded check (IST)'].map(label=>({key:label,label}));
  const [selected, setSelected] = useState<string | null>(null);
  const [params, setParams] = useSearchParams(),
    [version, setVersion] = useState(0);
  const query = new URLSearchParams();
  for (const key of [
    "page",
    "state",
    "environment",
    "reference",
    "from",
    "to",
    "date_field",
    "issue",
    "refund",
  ])
    if (params.get(key)) query.set(key, params.get(key)!);
  const result = useRead<Result>(`/payments?${query}`, version),
    data = result?.data;
  function page(value: number) {
    const next = new URLSearchParams(params);
    next.set("page", String(value));
    setParams(next);
  }
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Payments & refunds</h1>
        <div className="flex items-center gap-2"><ColumnPicker columns={columns} hidden={hidden} onChange={setHidden}/><Button variant="outline" disabled={!result} onClick={() => setVersion((v) => v + 1)}><RefreshCw size={16}/>
          Refresh records
        </Button></div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
      <FilterBuilder hasExtraFilters={Boolean(params.get('from')||params.get('to'))} onClear={()=>setParams({})} fields={[
        {key:'reference',label:'Ride reference',value:params.get('reference')||'',operator:'is',maxLength:24,normalize:value=>value.trim().toUpperCase(),valid:value=>/^R0*[1-9][0-9]*$/.test(value)},
        {key:'date_field',label:'Date basis',value:params.get('date_field')||'',options:[{value:'created',label:'Order created'},{value:'paid',label:'Payment recorded paid'},{value:'refund_requested',label:'Refund requested'},{value:'refund_completed',label:'Refund completion recorded'}]},
        {key:'state',label:'Recorded payment state',value:params.get('state')||'',options:['pending','processing','paid','booked','refund_pending','refunded','settled','closed','expired'].map(value=>({value,label:value.replaceAll('_',' ')}))},
        {key:'environment',label:'Payment environment',value:params.get('environment')||'',options:[{value:'SANDBOX',label:'Sandbox / test'},{value:'PRODUCTION',label:'Production'}]},
        {key:'refund',label:'Recorded refund state',value:params.get('refund')||'',options:[['PENDING','Pending'],['SUCCESS','Success recorded'],['FAILED','Failed'],['CANCELLED','Cancelled'],['ONHOLD','On hold'],['PENDING_APPROVAL','Pending approval'],['REJECTED','Rejected'],['NOT_APPLICABLE','Not applicable']].map(([value,label])=>({value,label}))},
        {key:'issue',label:'Recorded errors',value:params.get('issue')||'',options:[{value:'recorded_error',label:'Errors only'}]},
      ]} onChange={values=>{setSelected(null);setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/>
      <DateRangeFilter key={`${params.get('from')}:${params.get('to')}`} from={params.get('from')||''} to={params.get('to')||''} label="Payment date range (IST)" onChange={range=>{setSelected(null);setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const key of ['from','to'] as const){if(range[key])next.set(key,range[key]);else next.delete(key);}return next;});}}/>
      </div>
      {selected && (
        <div className="space-y-2 border-b p-4"><p className="text-xs text-muted-foreground">Payment record {selected}</p>
    
          <Button variant="outline" onClick={() => setSelected(null)}>
            Close payment details
          </Button>
          <PaymentInspection key={selected} id={selected} />
        </div>
      )}
      {!result && <p role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><RefreshCw size={16} className="animate-spin"/>Loading payment records…</p>}
      {result?.error && (
        <p role="alert" className="p-6 text-destructive">
          {result.error}
        </p>
      )}
      {data && (
        <>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            {data.total} records · Retrieved {time(data.generated_at)} IST
          </p>
          {data.items.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 rounded-full bg-muted p-4"><CreditCard size={24} className="text-muted-foreground"/></div><h2 className="font-semibold">No payment records found</h2><p className="mt-2 text-sm text-muted-foreground">No payment records match these filters.</p><p className="mt-1 text-sm text-muted-foreground">Try another ride reference, date range or recorded state.</p></div>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Ride",
                      "Environment",
                      "Recorded state",
                      "Recorded refund",
                      "Order amount",
                      "Created (IST)",
                      "Paid (IST)",
                      "Last recorded check (IST)",
                    ].filter(label=>!hidden.includes(label)).map((label) => (
                      <th key={label} className="p-4 text-xs font-medium text-muted-foreground">
                        {label}
                      </th>
                    ))}
                    <th className="w-12"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id} className="border-t hover:bg-muted/30">
                      <td className="p-3">
                        {row.ride_id ? (
                          <Link
                            className="text-emerald-800 underline"
                            to={`/trips?kind=rides&id=${encodeURIComponent(row.ride_id)}`}
                          >
                            View ride
                          </Link>
                        ) : (
                          "Unavailable"
                        )}
                      </td>
                      {!hidden.includes('Environment')&&(<td className="p-3 font-medium">
                        {row.environment === "SANDBOX"
                          ? "Test payment"
                          : row.environment === "PRODUCTION"
                            ? "Production"
                            : "Unknown"}
                      </td>)}
                      {!hidden.includes('Recorded state')&&(<td className="p-3"><Badge variant="outline">{row.state.replaceAll("_", " ")}</Badge></td>)}
                      {!hidden.includes('Recorded refund')&&(<td className="p-3">
                        {row.refund_status === "SUCCESS"
                          ? "Success recorded"
                          : (row.refund_status || "not_recorded").replaceAll(
                              "_",
                              " ",
                            )}
                      </td>)}
                      {!hidden.includes('Order amount')&&(<td className="p-3 font-semibold">
                        {row.amount === null ? "Unavailable" : `₹${row.amount}`}
                      </td>)}
                      {!hidden.includes('Created (IST)')&&(<td className="p-3">{time(row.created_at)}</td>)}
                      {!hidden.includes('Paid (IST)')&&(<td className="p-3">{time(row.paid_at)}</td>)}
                      {!hidden.includes('Last recorded check (IST)')&&(<td className="p-3">{time(row.checked_at)}</td>)}
                      <td className="p-3">{(session?.staff.permissions.includes('payments.inspect')||row.ride_id)&&<DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for payment ${row.id}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p>{session?.staff.permissions.includes('payments.inspect')&&<DropdownMenuItem onClick={()=>setSelected(row.id)}>Inspect payment</DropdownMenuItem>}{row.ride_id&&<DropdownMenuItem render={<Link to={`/trips?kind=rides&id=${encodeURIComponent(row.ride_id)}`}/>}>View ride</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
      </div>
      <details className="group text-sm text-muted-foreground"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Info size={15}/>About payment records<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary><div className="mt-3 max-w-4xl space-y-2 leading-relaxed"><p>
        Recorded online payment orders only; wallet payments are not included.
        This is not a live provider check. Pending or unknown does not mean
        failed. A paid record does not by itself confirm booking, refund or
        settlement. Refund actions are not available here.
      </p><p>
          The entire end date is included in India time. Date ranges exclude
          records without the selected timestamp, including older refunds
          without recorded dates. Refund completion is when Gilo recorded
          success, not a bank credit timestamp.
        </p><p>
        Refund state is separate from payment state and reflects stored
        evidence, not a live provider check.
      </p><p>
        Includes orders with a stored reconciliation or booking error. It does
        not mean payment failed or that the error is still occurring. Inspect
        the record for available evidence.
      </p></div></details>
    </section>
  );
}

