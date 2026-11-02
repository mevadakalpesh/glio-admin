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
type Counts={created:number;mature:number;awaiting_observation:number;booked:number;started:number;completed:number;gaps:number;booking_rate:number|null;start_rate:number|null;completion_rate:number|null};
type Report={filters:Record<string,string>;total:Counts;daily:({date:string}&Counts)[];states:{code:string;name:string}[];scope:string;basis:string;generated_at:string};
const rate=(v:number|null)=>v===null?'Not available':`${v.toFixed(2)}%`;
export function CohortReports(){const {session}=useAuth(),[params]=useSearchParams();return session?.staff.permissions.includes('reports.read')?<CohortReport key={params.toString()}/>:<p>You do not have access to conversion reports.</p>;}
function CohortReport(){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),[version,setVersion]=useState(0),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+19800000).toISOString().slice(0,10));
 const filters={from:params.get('from')||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10),to:params.get('to')||today,state:params.get('state')||'',observation_days:params.get('observation_days')||'7'};
 const result=useRead<Report>(`/reports/cohorts?${new URLSearchParams(filters)}`,version),data=result?.data,pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function download(){if(!session||!data||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');try{
  const r=await api<Report&{csv:string;filename:string}>('/reports/cohorts/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters:data.filters,reason:reason.trim()}});if(pending.current!==controller)return;
  const url=URL.createObjectURL(new Blob([r.csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=r.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Conversion CSV downloaded from a fresh audited snapshot. Observation eligibility and counts may differ from this screen.');
 }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Export unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Recorded ride conversion</h1><Link className="text-emerald-800 underline" to="/reports">Daily activity report</Link><Button variant="outline" disabled={busy} onClick={()=>{setMessage('');setVersion(v=>v+1);}}>Refresh conversion report</Button></div>
 <p className="rounded-xl border bg-white p-4 text-sm">Group ride requests by creation date, then count recorded booking, start and completion within a fixed observation window. New rides still awaiting observation are excluded from percentages.</p>
 <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setParams(Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v)])));}}>
 <DateRangeFilter key={`${filters.from}:${filters.to}`} from={filters.from} to={filters.to} required label="Report date range (IST)"/>

 <label>Observation window<NativeSelect className="block rounded border p-2" name="observation_days" defaultValue={filters.observation_days}>{['1','7','30'].map(d=><option key={d} value={d}>{d} {d==='1'?'day':'days'}</option>)}</NativeSelect></label>
 <label>State<NativeSelect className="block rounded border p-2" name="state" defaultValue={filters.state}><option value="">All accessible states</option>{data?.states.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}{filters.state&&!data?.states.some(s=>s.code===filters.state)&&<option value={filters.state}>{filters.state}</option>}</NativeSelect></label><Button type="submit" disabled={busy}>Apply conversion filters</Button></form><p className="text-xs">Creation-date range: up to 93 IST calendar days. Observation days are elapsed 24-hour periods from each ride’s creation.</p>
 {!result&&<p role="status">Loading conversion report…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {data&&<><p className="text-sm">{data.scope} · Snapshot {new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="rounded border bg-amber-50 p-3 text-sm">{data.basis}</p>
 <div className="grid gap-4 sm:grid-cols-3">{[['Requests created',data.total.created],['Full observation window',data.total.mature],['Awaiting observation',data.total.awaiting_observation]].map(([label,n])=><article key={label} className="rounded-xl border bg-white p-5"><h2>{label}</h2><p className="text-3xl font-semibold text-emerald-800">{n}</p></article>)}</div>
 {data.total.mature===0&&<p>No rides have a full observation window in this selection. Conversion percentages are unavailable, not zero.</p>}
 <div className="grid gap-4 sm:grid-cols-3">{[['Recorded booking',data.total.booked,data.total.booking_rate],['Recorded start',data.total.started,data.total.start_rate],['Recorded completion',data.total.completed,data.total.completion_rate]].map(([label,n,pct])=><article key={String(label)} className="rounded-xl border bg-white p-5"><h2>{label}</h2><p className="text-2xl font-semibold">{rate(pct as number|null)}</p><p className="text-sm">{n} of {data.total.mature} fully observed requests</p></article>)}</div>
 <p className="rounded border p-3 text-sm">History gaps: {data.total.gaps} fully observed rides have a start/completion log without a valid preceding milestone chain. Missing logs may understate conversion even when no gap is detectable. No current-status fallback is used.</p>
 <div className="overflow-x-auto rounded-xl border bg-white"><AdminTable className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">Daily creation cohorts</caption><thead><tr>{['Created date (IST)','Created','Full window','Awaiting','Booked','Started','Completed','History gaps','Completion %'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.daily.map(d=><tr key={d.date} className="border-t">{[d.date,d.created,d.mature,d.awaiting_observation,d.booked,d.started,d.completed,d.gaps,rate(d.completion_rate)].map((v,i)=><td className="p-3" key={i}>{v}</td>)}</tr>)}</tbody></AdminTable></div>
 {session?.staff.permissions.includes('reports.export')&&<section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Export conversion CSV</h2><p className="text-sm">Daily cohorts and totals with the observation window and metric definitions. No participant or journey identifiers.</p><label className="block">Conversion export reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10} onClick={()=>void download()}>{busy?'Preparing conversion export…':'Download conversion CSV'}</Button></section>}</>}{message&&<p role="status">{message}</p>}</section>;
}
