import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Review={confirmation_source?:string;state:string;guidance:string;ride_status:string|null;exit_confirmed_at:string|null;checked_at:string};
const stamp=(v:string)=>new Date(v).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST';
export function CaseExitReview({id}:{id:string}){
 const {session}=useAuth();const [reason,setReason]=useState(''),[data,setData]=useState<Review|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('cases.description.read'))return null;
 async function read(){if(pending.current||!session)return;const controller=new AbortController();pending.current=controller;setBusy(true);setData(null);setError('');try{const result=await api<Review>(`/ride-cases/${encodeURIComponent(id)}/exit-review`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{reason:reason.trim()}});if(pending.current===controller)setData(result);}catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Exit review unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Passenger exit review</h2><p className="text-sm text-slate-600">Check recorded exit evidence and ride status. This review does not confirm exit, release a seat, complete a trip or move money.</p>
 <form onSubmit={e=>{e.preventDefault();void read();}} className="space-y-2"><label className="block">Exit-review reason<Input className="mt-1 block w-full rounded border p-2" required minLength={10} maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button type="submit" disabled={busy||reason.trim().length<10}>{busy?'Checking exit evidence…':'Review passenger exit'}</Button></form>
 {error&&<p role="alert">{error}</p>}{data&&<div className="space-y-2 rounded border bg-slate-50 p-3"><p className="font-medium">{data.state.replaceAll('_',' ')}</p><p>{data.guidance}</p><p>Ride status: {data.ride_status||'Unavailable'}</p><p>Confirmation source: {data.confirmation_source==='passenger_app'?'Passenger app':data.confirmation_source==='staff_independent_approval'?'Direct passenger contact with independent staff approval':'Not verified from recorded evidence'}</p><p>Recorded exit: {data.exit_confirmed_at?stamp(data.exit_confirmed_at):'Not confirmed'}</p><p className="text-xs">Snapshot: {stamp(data.checked_at)}</p><Button variant="ghost" onClick={()=>setData(null)}>Hide exit review</Button></div>}
 </section>;
}
