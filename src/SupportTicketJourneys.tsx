import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Journey={id:string;reference:string;status_label:string};
type Result={trip:Journey|null;relationship:'traveler'|'passenger'|null;rides:Journey[];has_more:boolean;next_before:string|null};
export function SupportTicketJourneys({id,reason}:{id:string;reason:string}){
 const {session}=useAuth(),[data,setData]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('journeys.read'))return null;
 async function load(){if(!session||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{const r=await api<Result>(`/support-tickets/${encodeURIComponent(id)}/journeys`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{reason,...(data?.next_before?{before:data.next_before}:{})}});if(pending.current===controller)setData(old=>({...r,rides:[...(old?.rides||[]),...r.rides]}));}catch(e){if(pending.current===controller){setData(null);setError(e instanceof Error?e.message:'Linked journeys unavailable.');}}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Verified journey links</h3><p className="text-xs">Only journeys linked to this ticket’s customer and accessible to you are shown. Journey details apply their own access checks. These links do not change a booking or payment.</p>{error&&<p role="alert">{error}</p>}{data&&(data.trip?<><p>Ticket submitted by the {data.relationship}.</p><Link className="block text-emerald-800 underline" to={`/trips?kind=trips&id=${encodeURIComponent(data.trip.id)}`}>{data.trip.reference} · {data.trip.status_label}</Link>{data.rides.map(r=><Link key={r.id} className="block text-emerald-800 underline" to={`/trips?kind=rides&id=${encodeURIComponent(r.id)}`}>{r.reference} · {r.status_label}</Link>)}{!data.rides.length&&<p className="text-sm">No passenger bookings for this ticket’s customer on this trip.</p>}</>:<p>No verified journey link is available for this ticket.</p>)}{(!data||data.has_more)&&<Button variant="outline" disabled={busy} onClick={()=>void load()}>{busy?'Checking journey links…':data?'Load more booking links':'View verified journey links'}</Button>}</section>;
}
