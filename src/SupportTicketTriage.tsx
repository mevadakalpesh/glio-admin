import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
export function SupportTicketTriage({id,version,customerPriority,staffPriority,onSaved}:{id:string;version:number;customerPriority:string;staffPriority:string|null;onSaved:()=>void}){
 const {session}=useAuth(),[priority,setPriority]=useState(staffPriority??''),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('support.tickets.triage'))return null;
 async function save(){if(!session||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');try{await api(`/support-tickets/${encodeURIComponent(id)}/priority`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{version,priority:priority||null,reason:reason.trim()}});if(pending.current===controller)onSaved();}catch(e){if(pending.current===controller)setError((e instanceof Error?e.message:'Priority unavailable.')+' Refresh the ticket before retrying.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}}
 return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Review ticket priority</h3><p className="text-sm">Customer reported: {customerPriority}. The queue uses the staff priority when set. This does not change a follow-up deadline, notify the customer or open a safety case.</p><label className="block">Staff priority<NativeSelect className="block rounded border p-2" value={priority} disabled={busy} onChange={e=>setPriority(e.target.value)}><option value="">Use customer priority</option>{['low','medium','high','urgent'].map(p=><option key={p} value={p}>{p}</option>)}</NativeSelect></label><label className="block">Priority review reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10||(priority||null)===(staffPriority??null)} onClick={()=>void save()}>{busy?'Saving priority…':'Save reviewed priority'}</Button>{error&&<p role="alert">{error}</p>}</section>;
}
