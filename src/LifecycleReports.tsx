import {AdminTable} from '@/components/ui/admin-table';
import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import {DateRangeFilter} from '@/components/ui/date-range-filter';
import {useEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {api} from './api';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {Button} from '@/components/ui/button';
type Counts={events:number;rides:number};
type Report={filters:Record<string,string>;total:Counts;daily:({date:string}&Counts)[];breakdown:({event:string;label:string}&Counts)[];event_options:{value:string;label:string}[];states:{code:string;name:string}[];scope:string;basis:string;generated_at:string};
export function LifecycleReports(){const {session}=useAuth(),[params]=useSearchParams();return session?.staff.permissions.includes('reports.read')?<LifecycleReport key={params.toString()}/>:<p>You do not have access to lifecycle reports.</p>;}
function LifecycleReport(){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),[version,setVersion]=useState(0),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+19800000).toISOString().slice(0,10));
 const filters={from:params.get('from')||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10),to:params.get('to')||today,state:params.get('state')||'',event:params.get('event')||''};
 const result=useRead<Report>(`/reports/lifecycle?${new URLSearchParams(filters)}`,version),data=result?.data,pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function download(){if(!session||!data||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');try{
  const r=await api<Report&{csv:string;filename:string}>('/reports/lifecycle/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters:data.filters,reason:reason.trim()}});if(pending.current!==controller)return;
  const url=URL.createObjectURL(new Blob([r.csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=r.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Lifecycle CSV downloaded from a fresh audited snapshot. It may differ from the displayed report.');
 }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Export unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Recorded ride lifecycle</h1><Link className="text-emerald-800 underline" to="/reports">Daily activity report</Link><Button variant="outline" disabled={busy} onClick={()=>{setMessage('');setVersion(v=>v+1);}}>Refresh lifecycle report</Button></div>
 <p className="rounded-xl border bg-white p-4 text-sm">Historical activity by recorded event date in IST. Repeated events are counted; distinct rides are counted separately. This is not a conversion funnel, and recorded payment events do not prove settlement.</p>
 <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setParams(Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v)])));}}>
 <DateRangeFilter key={`${filters.from}:${filters.to}`} from={filters.from} to={filters.to} required label="Report date range (IST)"/>

 <label>Recorded event<NativeSelect className="block rounded border p-2" name="event" defaultValue={filters.event}><option value="">All recorded events</option>{data?.event_options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}{filters.event&&!data?.event_options.some(o=>o.value===filters.event)&&<option value={filters.event}>{filters.event}</option>}</NativeSelect></label>
 <label>State<NativeSelect className="block rounded border p-2" name="state" defaultValue={filters.state}><option value="">All accessible states</option>{data?.states.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}{filters.state&&!data?.states.some(s=>s.code===filters.state)&&<option value={filters.state}>{filters.state}</option>}</NativeSelect></label><Button type="submit" disabled={busy}>Apply lifecycle filters</Button></form><p className="text-xs">Up to 93 calendar days per report. Both ride endpoints must be within your allowed region.</p>
 {!result&&<p role="status">Loading lifecycle report…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {data&&<><p className="text-sm">{data.scope} · Snapshot {new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="rounded border bg-amber-50 p-3 text-sm">{data.basis}</p>
 <div className="grid gap-4 sm:grid-cols-2"><article className="rounded-xl border bg-white p-5"><h2>Recorded events</h2><p className="text-3xl font-semibold text-emerald-800">{data.total.events.toLocaleString('en-IN')}</p></article><article className="rounded-xl border bg-white p-5"><h2>Distinct rides in this window</h2><p className="text-3xl font-semibold text-emerald-800">{data.total.rides.toLocaleString('en-IN')}</p></article></div>
 {data.total.events===0&&<p>No recorded events match these dates and filters. Missing logs are not reconstructed.</p>}
 <div className="overflow-x-auto rounded-xl border bg-white"><AdminTable className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">Daily recorded activity</caption><thead><tr>{['Event date (IST)','Events','Distinct rides on day'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.daily.map(d=><tr key={d.date} className="border-t"><td className="p-3">{d.date}</td><td className="p-3">{d.events}</td><td className="p-3">{d.rides}</td></tr>)}</tbody></AdminTable></div>
 <div className="overflow-x-auto rounded-xl border bg-white"><AdminTable className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">Event breakdown</caption><thead><tr>{['Recorded event','Events','Distinct rides with event'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.breakdown.map(d=><tr key={d.event} className="border-t"><td className="p-3">{d.label}</td><td className="p-3">{d.events}</td><td className="p-3">{d.rides}</td></tr>)}</tbody></AdminTable></div>
 <p className="text-xs">A ride may appear on several days and in several event categories. Do not sum distinct-ride rows to calculate the window total. Unrecognized actions are grouped as Other recorded activity.</p>
 {session?.staff.permissions.includes('reports.export')&&<section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Export lifecycle CSV</h2><p className="text-sm">Aggregated daily and event counts only; no participants, journey IDs or event metadata.</p><label className="block">Lifecycle export reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10} onClick={()=>void download()}>{busy?'Preparing lifecycle export…':'Download lifecycle CSV'}</Button></section>}</>}{message&&<p role="status">{message}</p>}</section>;
}
