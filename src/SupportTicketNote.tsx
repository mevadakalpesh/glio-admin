import {Textarea} from '@/components/ui/textarea';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
export function SupportTicketNote({id,version,onSaved}:{id:string;version:number;onSaved:()=>void}){
 const {session}=useAuth(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<AbortController|null>(null),operation=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('support.tickets.notes'))return null;
 async function save(){if(pending.current||!session)return;const key=JSON.stringify([version,message.trim()]);if(operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{await api(`/support-tickets/${id}/notes`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{version,operation_id:operation.current.id,message:message.trim()}});if(pending.current===controller)onSaved();}catch(e){if(pending.current===controller)setError((e instanceof Error?e.message:'Update unavailable.')+' If the ticket changed, refresh its content before editing.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-semibold">Add internal staff note</h3><p className="text-sm">Visible only to authorized Gilo staff. This does not message the customer or change the ticket status. Saved notes cannot be edited; add a follow-up correction if needed.</p><label className="block">Internal note<Textarea className="block w-full rounded border bg-white p-2" value={message} onChange={e=>setMessage(e.target.value)} maxLength={4000} disabled={busy}/></label><Button disabled={busy||message.trim().length<10} onClick={()=>void save()}>{busy?'Saving note…':'Save internal note'}</Button>{error&&<p role="alert">{error}</p>}</section>;
}
