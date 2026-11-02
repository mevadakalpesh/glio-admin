import {AdminTable} from '@/components/ui/admin-table';
import {DateTimePicker} from '@/components/ui/date-time-picker';
import {NativeSelect} from '@/components/ui/native-select';
import {historyBounds} from "./trackingWindow";
import {TrackingPlayback} from "./TrackingPlayback";
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {useAuth} from './useAuth';
import {api} from './api';
type Signal={state:string;age_seconds:number|null;recorded_at:string|null};
type Evidence={mode?:"page"|"window";trip:{reference:string|null;status:string};gps:Signal;heartbeat:Signal;items:{id:string;latitude:number|null;longitude:number|null;heading:number|null;recorded_at:string|null}[];page:number;page_size:number;total:number;from:string;to:string;generated_at:string};
const stamp=(value:string|null)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'medium'})+' IST':'Unavailable';
export function TrackingInspection({id,onClose,historical=false}:{id:string;onClose:()=>void;historical?:boolean}){
 const {session}=useAuth();
 const [minutes,setMinutes]=useState(historical?'custom':'30'),[data,setData]=useState<Evidence|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [customFrom,setCustomFrom]=useState(""),[customTo,setCustomTo]=useState("");
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('tracking.evidence.read'))return null;
 async function read(page=1,keepWindow=false,mode:"page"|"window"="page"){
  if(pending.current||!session)return;
  const bounds=keepWindow&&data?{from:data.from,to:data.to}:minutes==="custom"?historyBounds(customFrom,customTo):{window_minutes:Number(minutes)};
  if(!bounds){setData(null);setError("Choose valid start and end times in IST, up to six hours apart.");return;}
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  setData(null);
  try{
   const value=await api<Evidence>(`/tracking/${encodeURIComponent(id)}/inspection`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{page,...bounds,...(mode==="window"?{mode}: {})}});
   if(pending.current===controller)setData(value);
  }catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Tracking evidence is unavailable.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-4 rounded-xl border bg-white p-5" aria-label="Recorded tracking evidence">
  <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">Recorded tracking evidence</h2><Button variant="ghost" onClick={onClose}>Close inspection</Button></div>
  <p className="text-sm text-slate-600">Precise locations are restricted and every inspection is audited. Records show where the app reported a location, not proof of physical presence. GPS accuracy was not stored with these samples.</p>
  <form className="flex flex-wrap items-end gap-3" onSubmit={e=>{e.preventDefault();void read();}}>

   <label className="text-sm">History window<NativeSelect className="mt-1 block rounded border p-2" value={minutes} disabled={busy} onChange={e=>setMinutes(e.target.value)}><option value="5">Last 5 minutes</option><option value="15">Last 15 minutes</option><option value="30">Last 30 minutes</option><option value="120">Last 2 hours</option><option value="360">Last 6 hours</option><option value="custom">Earlier window (IST)</option></NativeSelect></label>
   {minutes==="custom"&&<><DateTimePicker label="From date and time (IST)" dateLabel="From date" disabled={busy} value={customFrom} onChange={setCustomFrom}/><DateTimePicker label="To date and time (IST)" dateLabel="To date" disabled={busy} value={customTo} onChange={setCustomTo}/><p className="w-full text-xs text-slate-500">Select up to six hours from any earlier date. For longer journeys, inspect adjacent windows. Future windows are rejected by the server.</p></>}
   <Button type="submit" disabled={busy}>{busy?'Loading evidence…':'Inspect recorded locations'}</Button>
  </form>
  {error&&<p role="alert" className="text-red-700">{error}</p>}
  {data&&<>
   <h3 className="font-semibold">{data.trip.reference||'Reference unavailable'} · {data.trip.status}</h3>
   <div className="grid gap-3 sm:grid-cols-2"><p className="rounded-lg bg-slate-50 p-3 text-sm">Latest GPS: <strong>{data.gps.state}</strong><br/>{stamp(data.gps.recorded_at)}</p><p className="rounded-lg bg-slate-50 p-3 text-sm">App heartbeat: <strong>{data.heartbeat.state}</strong><br/>{stamp(data.heartbeat.recorded_at)}</p></div>
   <p className="text-xs text-slate-500">History: {stamp(data.from)} – {stamp(data.to)}. Snapshot: {stamp(data.generated_at)}. Latest GPS and heartbeat describe the current snapshot; the selected window applies to history and playback. No automatic refresh of precise locations.</p>
   <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled={busy} onClick={()=>void read(1,true,data.mode==="window"?"page":"window")}>{data.mode==="window"?"Return to paged inspection":"Load full window for playback"}</Button><p className="text-xs text-slate-500">Full-window playback includes every recorded sample, up to 1,000. Larger windows require a shorter time range; samples are never silently dropped.</p></div>
   <TrackingPlayback key={`${data.from}:${data.to}:${data.page}:${data.mode}`} samples={data.items} scope={data.mode==="window"?"window":"page"}/>
   {data.items.length===0?<p>No location samples were recorded in this window.</p>:<div className="overflow-x-auto"><AdminTable className="w-full text-left text-sm"><thead><tr>{['Recorded (IST)','Latitude','Longitude','Heading'].map(title=><th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{data.items.map(row=><tr className="border-t" key={row.id}><td className="p-3">{stamp(row.recorded_at)}</td><td className="p-3">{row.latitude??'Unavailable'}</td><td className="p-3">{row.longitude??'Unavailable'}</td><td className="p-3">{row.heading===null?'Unavailable':`${row.heading}°`}</td></tr>)}</tbody></AdminTable></div>}
   {data.mode!=="window"&&<div className="flex items-center gap-3"><Button variant="outline" disabled={busy||data.page<=1} onClick={()=>void read(data.page-1,true)}>Previous samples</Button><span className="text-sm">Page {data.page} · {data.total} samples</span><Button variant="outline" disabled={busy||data.page*data.page_size>=data.total||data.page>=1000} onClick={()=>void read(data.page+1,true)}>Next samples</Button></div>}
   <p className="text-xs text-slate-500">Missing or stale records do not establish a no-show, unsafe passenger exit or trip completion. Confirm with participants through the appropriate support workflow.</p>
  </>}
 </section>;
}
