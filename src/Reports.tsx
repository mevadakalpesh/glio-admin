import {Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger} from '@/components/ui/dialog';
import {AdminTable} from '@/components/ui/admin-table';
import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Download,RefreshCw,ArrowUpRight,Car,Users,X} from 'lucide-react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Summary={total:number;cancelled:number;completed:number;statuses:{status:string;label:string;count:number}[]};
type Report={filters:{from:string;to:string;state:string};daily:{date:string;trips:number;rides:number}[];trips:Summary;rides:Summary;states:{code:string;name:string}[];scope:string;date_basis:string;generated_at:string};
export function Reports(){const {session}=useAuth();const [params]=useSearchParams();return session?.staff.permissions.includes('reports.read')?<ActivityReport key={params.toString()}/>:<p>You do not have access to activity reports.</p>;}
function ActivityReport(){
 const {session}=useAuth();const [params,setParams]=useSearchParams(),[version,setVersion]=useState(0),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[exportOpen,setExportOpen]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+19800000).toISOString().slice(0,10));const start=new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10);
 const filters={from:params.get('from')||start,to:params.get('to')||today,state:params.get('state')||''},query=new URLSearchParams(filters).toString();
 const result=useRead<Report>(`/reports/journeys?${query}`,version),data=result?.data,pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function download(){if(!session||!data||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');
  try{const report=await api<Report&{csv:string;filename:string}>('/reports/journeys/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters:data.filters,reason:reason.trim()}});if(pending.current!==controller)return;
   const url=URL.createObjectURL(new Blob([report.csv],{type:'text/csv;charset=utf-8;'})),link=document.createElement('a');link.href=url;link.download=report.filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage(`CSV generated from a fresh snapshot at ${new Date(report.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Counts may differ from the displayed snapshot.`);
  }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Export unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 const hasFilters=Boolean(params.get('state')||filters.from!==start||filters.to!==today);
 function updateFilters(values:Record<string,string>){setParams(previous=>{const next=new URLSearchParams(previous);for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}
 return <section className="space-y-6">
 <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">Ride & trip activity</h1><p className="mt-2 text-sm text-muted-foreground">Created journeys and current status · Times in IST</p></div><div className="flex flex-wrap gap-2">
 {session?.staff.permissions.includes('reports.export')&&<Dialog open={exportOpen} onOpenChange={open=>{if(busy)return;setExportOpen(open);if(!open){setReason('');setMessage('');}}}><DialogTrigger render={<Button variant="outline" disabled={!data||busy}/> }><Download size={16}/>Export report</DialogTrigger><DialogContent><DialogTitle className="pr-8 text-xl font-semibold">Export aggregate CSV</DialogTitle><DialogDescription className="mt-2 text-sm text-muted-foreground">Download daily totals and status counts from a fresh audited snapshot.</DialogDescription><div className="mt-5 space-y-4"><p className="text-sm text-muted-foreground">No names, contact details or journey IDs are included. The report uses your selected date range and state.</p><label className="block text-sm font-medium">Export reason<Input className="mt-2" value={reason} maxLength={500} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>{message&&<p role="status" className="text-sm">{message}</p>}<Button disabled={busy||!data||reason.trim().length<10} onClick={()=>void download()}><Download size={16}/>{busy?'Preparing export…':'Download CSV'}</Button></div></DialogContent></Dialog>}
 <Button variant="outline" disabled={busy} onClick={()=>{setMessage('');setVersion(v=>v+1);}}><RefreshCw size={16}/>Refresh report</Button></div></div>
 <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4">
 <DateRangeFilter key={`${filters.from}:${filters.to}`} from={filters.from} to={filters.to} required label="Report date range (IST)" onChange={updateFilters}/>
 <div className="w-56"><NativeSelect aria-label="State" value={filters.state} onChange={e=>updateFilters({state:e.target.value})}><option value="">All accessible states</option>{data?.states.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}{filters.state&&!data?.states.some(s=>s.code===filters.state)&&<option value={filters.state}>{filters.state}</option>}</NativeSelect></div>
 {hasFilters&&<Button variant="ghost" size="icon" aria-label="Clear report filters" title="Clear report filters" onClick={()=>setParams({})}><X size={16}/></Button>}
 <span className="text-xs text-muted-foreground sm:ml-auto">Up to 93 days · Both endpoints in selected state</span></div>
 {!result&&<p role="status" className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">Loading activity report…</p>}{result?.error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>}
 {data&&<>
 <div className="grid gap-4 sm:grid-cols-2">{(['trips','rides'] as const).map(kind=>{const Icon=kind==='trips'?Car:Users;return <article key={kind} className="overflow-hidden rounded-2xl border bg-card"><div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3"><h2 className="text-sm font-medium">{kind==='trips'?'Trips created':'Ride requests created'}</h2><Icon size={18} className="text-muted-foreground"/></div><div className="p-5"><p className="text-3xl font-semibold tabular-nums">{data[kind].total.toLocaleString('en-IN')}</p><div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"><span>Currently completed <strong className="ml-1 text-foreground">{data[kind].completed}</strong></span><span>Currently cancelled <strong className="ml-1 text-foreground">{data[kind].cancelled}</strong></span></div></div></article>;})}</div>
 <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{data.scope}</span><span>Snapshot {Number.isFinite(Date.parse(data.generated_at))?new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}):'Time unavailable'} IST</span></div>
 {data.rides.total===0&&data.trips.total===0&&<p className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">No journeys were created in this range and scope.</p>}
 <div className="overflow-hidden rounded-2xl border bg-card"><AdminTable className="w-full text-left text-sm" toolbar={<h2 className="py-2 font-semibold">Daily created journeys (IST)</h2>}><thead className="border-b bg-muted/20 text-xs text-muted-foreground"><tr>{['Date','Trips','Ride requests'].map(t=><th className="p-4 font-medium" key={t}>{t}</th>)}</tr></thead><tbody>{data.daily.map(d=><tr className="border-b last:border-0" key={d.date}><td className="p-4">{d.date}</td><td className="p-4 tabular-nums">{d.trips}</td><td className="p-4 tabular-nums">{d.rides}</td></tr>)}</tbody></AdminTable></div>
 <div className="grid gap-4 md:grid-cols-2">{(['trips','rides'] as const).map(kind=><div key={kind} className="overflow-hidden rounded-2xl border bg-card"><h2 className="border-b bg-muted/20 px-5 py-4 text-sm font-semibold">{kind==='trips'?'Trip':'Ride'} current statuses</h2>{data[kind].statuses.length?<ul className="divide-y">{data[kind].statuses.map(s=><li className="flex justify-between gap-4 px-5 py-3 text-sm" key={s.status}><span>{s.label}</span><strong className="tabular-nums">{s.count.toLocaleString('en-IN')}</strong></li>)}</ul>:<p className="p-5 text-sm text-muted-foreground">No records</p>}</div>)}</div>
 </>}
 <div className="rounded-2xl border bg-card p-5"><h2 className="text-sm font-semibold">Related reports</h2><div className="mt-3 flex flex-wrap gap-2">{[['/reports/cohorts','Recorded ride conversion'],['/reports/lifecycle','Recorded ride lifecycle'],['/reports/routes','Route activity report']].map(([to,label])=><Button key={to} variant="outline" render={<Link to={to}/>}>{label}<ArrowUpRight size={14}/></Button>)}</div></div>
 <details className="rounded-xl border p-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-medium text-foreground">About this report</summary><div className="mt-3 space-y-2"><p>Created-date report for ride requests and passenger-capable trips. Dates use IST. Package-only trips are excluded. Statuses reflect the current snapshot, not the status on each historical day. This is not a revenue or conversion report.</p>{data&&<p>{data.date_basis}</p>}</div></details>
 </section>;
}
