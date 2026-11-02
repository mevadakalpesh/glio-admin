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
type Row={origin_city:string;origin_state:string;origin_country:string;destination_city:string;destination_state:string;destination_country:string;count:number};
type Report={items:Row[];page:number;page_size:number;has_more:boolean;filters:Record<string,string>;states:{code:string;name:string}[];scope:string;basis:string;generated_at:string};
export function RouteReports(){const {session}=useAuth(),[params]=useSearchParams();return session?.staff.permissions.includes('reports.read')?<RouteReport key={params.toString()}/>:<p>You do not have access to route reports.</p>;}
function RouteReport(){
 const {session}=useAuth(),[params,setParams]=useSearchParams(),[version,setVersion]=useState(0),[reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [today]=useState(()=>new Date(Date.now()+19800000).toISOString().slice(0,10));
 const filters={from:params.get('from')||new Date(Date.parse(today)-29*86400000).toISOString().slice(0,10),to:params.get('to')||today,state:params.get('state')||'',kind:params.get('kind')||'rides',page:params.get('page')||'1'};
 const result=useRead<Report>(`/reports/routes?${new URLSearchParams(filters)}`,version),data=result?.data,pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 const page=(n:number)=>setParams({...filters,page:String(n)});
 const place=(row:Row,prefix:'origin'|'destination')=>[row[`${prefix}_city`]||'City not recorded',row[`${prefix}_state`]||'State not recorded',row[`${prefix}_country`]||'Country not recorded'].join(', ');
 async function download(){if(!session||!data||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');try{
  const r=await api<Report&{csv:string;filename:string}>('/reports/routes/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters:data.filters,reason:reason.trim()}});if(pending.current!==controller)return;
  const url=URL.createObjectURL(new Blob([r.csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=r.filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('This page was exported from a fresh audited snapshot. Ranking may differ from the displayed snapshot; other pages are not included.');
 }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Export unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Route activity</h1><Link className="text-emerald-800 underline" to="/reports">Daily activity report</Link><Button variant="outline" disabled={busy} onClick={()=>{setMessage('');setVersion(v=>v+1);}}>Refresh routes</Button></div>
 <p className="rounded-xl border bg-white p-4 text-sm">Explore recorded city-to-city routes in each direction. Ride-request routes and trip endpoints are separate: a traveler can serve an intermediate segment. These counts do not measure matching availability or unmet demand.</p>
 <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setParams(Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v)])));}}>
 <DateRangeFilter key={`${filters.from}:${filters.to}`} from={filters.from} to={filters.to} required label="Report date range (IST)"/>

 <label>Journey type<NativeSelect className="block rounded border p-2" name="kind" defaultValue={filters.kind}><option value="rides">Ride-request routes</option><option value="trips">Traveler trip endpoints</option></NativeSelect></label>
 <label>State<NativeSelect className="block rounded border p-2" name="state" defaultValue={filters.state}><option value="">All accessible states</option>{data?.states.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}{filters.state&&!data?.states.some(s=>s.code===filters.state)&&<option value={filters.state}>{filters.state}</option>}</NativeSelect></label><Button type="submit" disabled={busy}>Apply route filters</Button></form>
 <p className="text-xs">Created-date range: up to 93 days in IST. All recorded statuses are counted, including drafts and cancellations.</p>
 {!result&&<p role="status">Loading route activity…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {data&&<><p className="text-sm">{data.scope} · Snapshot {new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="text-xs text-slate-600">{data.basis}</p>
 {data.items.length?<div className="overflow-x-auto rounded-xl border bg-white"><AdminTable className="w-full text-left text-sm"><caption className="p-4 text-left font-semibold">{filters.kind==='trips'?'Traveler trip endpoints':'Ride-request routes'} · Highest counts first</caption><thead><tr>{['Origin','Destination','Created records'].map(h=><th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{data.items.map((r,i)=><tr key={i} className="border-t"><td className="p-3">{place(r,'origin')}</td><td className="p-3">{place(r,'destination')}</td><td className="p-3 font-semibold">{r.count.toLocaleString('en-IN')}</td></tr>)}</tbody></AdminTable></div>:<p>No routes match this page and its filters.</p>}
 <div className="flex gap-3"><Button variant="outline" disabled={busy||data.page<=1} onClick={()=>page(data.page-1)}>Previous routes</Button><span>Page {data.page} · Up to {data.page_size} routes</span><Button variant="outline" disabled={busy||!data.has_more} onClick={()=>page(data.page+1)}>Next routes</Button></div><p className="text-xs">Refresh or page changes create a new snapshot; rankings can change as records are added.</p>
 {session?.staff.permissions.includes('reports.export')&&<section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Export this page</h2><p className="text-sm">Up to 25 aggregate route rows, without addresses, coordinates, names or journey IDs.</p><label className="block">Route export reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||!data.items.length||reason.trim().length<10} onClick={()=>void download()}>{busy?'Preparing route export…':'Download route CSV'}</Button></section>}</>}{message&&<p role="status">{message}</p>}</section>;
}
