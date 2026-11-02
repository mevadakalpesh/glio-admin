import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {Bell,RefreshCw,X} from 'lucide-react';
import {useAuth} from './useAuth';
import {api} from './api';
import {Button} from '@/components/ui/button';
const queues=[
 {field:'escalated',label:'Escalated follow-ups',query:'due=escalated',urgent:true},
 {field:'first_response_overdue',label:'First responses overdue',query:'response=overdue',urgent:true},
 {field:'unacknowledged_overdue',label:'Follow-ups awaiting acknowledgement',query:'due=unacknowledged',urgent:true},
 {field:'awaiting_first_response',label:'Waiting for first response',query:'response=waiting',urgent:false},
] as const;
type Snapshot=Record<typeof queues[number]['field'],number>&{generated_at:string};
function validate(value:Snapshot){
 if(!value||queues.some(q=>!Number.isSafeInteger(value[q.field])||value[q.field]<0)||typeof value.generated_at!=='string'||!Number.isFinite(Date.parse(value.generated_at)))throw Error('Alert counts are unavailable. Please refresh.');
 return value;
}
export function StaffAlerts(){
 const {session}=useAuth(),location=useLocation();
 if(!session?.staff.permissions.includes('support.tickets.read'))return null;
 // Account/scope changes must discard the previous staff member's counts and requests.
 return <AlertMenu key={[location.key,session.staff.id,session.csrf_token,session.staff.role,...(session.staff.assigned_states||[]),...session.staff.permissions].join(':')}/>;
}
function AlertMenu(){
 const location=useLocation(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),pending=useRef<AbortController|null>(null);
 const [open,setOpen]=useState(false),[data,setData]=useState<Snapshot|null>(null),[status,setStatus]=useState('Checking alerts…'),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const refresh=useCallback(async()=>{
  if(document.visibilityState!=='visible'||!navigator.onLine||pending.current)return;
  const controller=new AbortController();pending.current=controller;
  setData(null);setBusy(true);setError(false);setStatus('Checking alerts…');
  const timeout=window.setTimeout(()=>{
   if(pending.current===controller){pending.current=null;controller.abort();setBusy(false);setError(true);setStatus('Alert check timed out. Please refresh.');}
  },15000);
  try{
   const snapshot=validate(await api<Snapshot>('/support-tickets/alerts',{signal:controller.signal}));
   if(pending.current===controller){setData(snapshot);setStatus('');}
  }catch{
   if(pending.current===controller){setError(true);setStatus('Alerts are unavailable. Please refresh.');}
  }finally{
   window.clearTimeout(timeout);
   if(pending.current===controller){pending.current=null;setBusy(false);}
  }
 },[]);
 useEffect(()=>{
  const pause=()=>{pending.current?.abort();pending.current=null;setData(null);setBusy(false);setError(false);setStatus(navigator.onLine?'Alerts paused while this page is hidden.':'You are offline. Alerts will refresh when connected.');};
  const check=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void refresh();else pause();};
  const changed=()=>{pending.current?.abort();pending.current=null;check();};
  check();
  window.addEventListener('gilo-support-alerts-changed',changed);
  const timer=window.setInterval(check,60000);
  window.addEventListener('focus',check);window.addEventListener('online',check);window.addEventListener('offline',check);document.addEventListener('visibilitychange',check);
  return()=>{window.removeEventListener('gilo-support-alerts-changed',changed);window.clearInterval(timer);window.removeEventListener('focus',check);window.removeEventListener('online',check);window.removeEventListener('offline',check);document.removeEventListener('visibilitychange',check);pending.current?.abort();pending.current=null;};
 },[refresh,location.key]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
 },[open]);
 const active=data?queues.filter(q=>data[q.field]>0):[],urgent=data&&queues.some(q=>q.urgent&&data[q.field]>0);
 return <div className="relative" ref={root}>
  <Button ref={trigger} variant="outline" aria-expanded={open} aria-controls="gilo-staff-alerts" aria-label={`Staff alerts${data?`: ${active.length} queues need review`:': status unavailable'}`} onClick={()=>{setOpen(v=>!v);if(!open)void refresh();}}>
   <Bell aria-hidden="true" size={17}/><span>Alerts</span>{data&&active.length>0&&<span className={`rounded-full px-2 text-xs ${urgent?'bg-red-100 text-red-800':'bg-emerald-100 text-emerald-800'}`}>{active.length}</span>}{error&&<span aria-hidden="true" className="text-amber-700">!</span>}
  </Button>
  {open&&<section id="gilo-staff-alerts" aria-label="Staff support alerts" className="fixed right-4 top-24 z-50 max-h-[75vh] w-[min(24rem,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-xl border bg-white p-4 shadow-xl">
   <div className="flex items-center justify-between"><h2 className="font-semibold">Support alerts</h2><Button variant="ghost" aria-label="Close staff alerts" onClick={()=>{setOpen(false);trigger.current?.focus();}}><X aria-hidden="true" size={18}/></Button></div>
   <p className="text-sm text-slate-600">Tickets within your access. Counts are by queue; a ticket can appear in more than one queue.</p>
   {status&&<p role={error?'alert':'status'} className="text-sm">{status}</p>}
   {data&&<>{active.length===0?<p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">No support tickets need review in these queues.</p>:<ul className="space-y-2">{active.map(q=><li key={q.field}><Link className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-emerald-700" to={'/support/tickets?'+q.query} onClick={()=>setOpen(false)}><span>{q.label}</span>{' '}<strong className={q.urgent?'text-red-700':'text-emerald-700'}>{data[q.field]}</strong></Link></li>)}</ul>}<p className="text-xs text-slate-500">Checked {new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p></>}
   <Button variant="outline" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={15} aria-hidden="true"/>Refresh alerts</Button>
   <p className="text-xs text-slate-500">Refreshes every minute while visible and online. Opening an alert does not acknowledge or resolve its tickets. No email or SMS is sent.</p>
  </section>}
 </div>;
}
