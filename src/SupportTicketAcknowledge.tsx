import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
export function SupportTicketAcknowledge({id,version,onSaved}:{id:string;version:number;onSaved:()=>void}){
 const {session}=useAuth(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('support.tickets.schedule'))return null;
 async function save(){if(!session||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{await api(`/support-tickets/${encodeURIComponent(id)}/acknowledge`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{version,reason:reason.trim()}});if(pending.current===controller)onSaved();}catch(e){if(pending.current===controller)setError((e instanceof Error?e.message:'Acknowledgement unavailable.')+' Refresh the ticket before retrying.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-3 rounded-lg border border-amber-200 p-4"><h3 className="font-semibold">Acknowledge overdue follow-up</h3><p className="text-sm">Record that you have reviewed this alert. The ticket stays open and overdue until its deadline is rescheduled or the ticket is resolved.</p><label className="block">Acknowledgement reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10} onClick={()=>void save()}>Acknowledge follow-up</Button>{error&&<p role="alert">{error}</p>}</section>;
}
