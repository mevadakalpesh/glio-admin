import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Notes={items:{id:string;note:string;by_you:boolean;created_at:string}[];page:number;total:number;page_size:number};
export function CaseFollowups({id}:{id:string}){
 const {session}=useAuth();const [reason,setReason]=useState(''),[note,setNote]=useState(''),[data,setData]=useState<Notes|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const pending=useRef<AbortController|null>(null),operation=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('cases.description.read'))return null;
 async function request(action:'read'|'add',page=1){
  if(pending.current||!session)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');setData(null);
  const key=JSON.stringify([reason.trim(),note.trim()]);
  if(action==='add'&&operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  try{
   const result=await api<Notes>(`/ride-cases/${encodeURIComponent(id)}/followups`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{action,reason:reason.trim(),...(action==='read'?{page}:{note:note.trim(),operation_id:operation.current!.id})}});
   if(pending.current!==controller)return;
   if(action==='read')setData(result);else {setNote('');operation.current=null;setMessage('Follow-up saved. Journey and payment states are unchanged.');}
  }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Unable to load or save follow-up.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Staff follow-up</h2>
 <p className="text-sm text-slate-600">Record contact attempts, reported facts and next steps. Notes are internal and append-only. They do not confirm passenger exit, fault or payment outcomes. Do not include OTPs, payment credentials or identity documents.</p>
 <label className="block text-sm">Follow-up access reason<Input className="mt-1 block w-full rounded border p-2" value={reason} maxLength={2000} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
 <div className="flex gap-2"><Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void request('read')}>View follow-ups</Button>{data&&<Button variant="ghost" onClick={()=>setData(null)}>Hide follow-ups</Button>}</div>
 {session.staff.permissions.includes('cases.assign')&&<><label className="block text-sm">Follow-up note<Textarea className="mt-1 block w-full rounded border p-2" value={note} maxLength={2000} disabled={busy} onChange={e=>setNote(e.target.value)}/></label><p className="text-xs text-slate-500">Claim the open case before adding a note. Notes cannot be edited or deleted.</p><Button disabled={busy||reason.trim().length<10||note.trim().length<10} onClick={()=>void request('add')}>Save follow-up</Button></>}
 {busy&&<p role="status">Processing follow-up…</p>}{message&&<p role="status">{message}</p>}
 {data&&<><ul className="space-y-3">{data.items.map(item=><li className="rounded border p-3" key={item.id}><p className="text-xs text-slate-500">{item.by_you?'You':'Staff member'} · {new Date(item.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="whitespace-pre-wrap">{item.note}</p></li>)}</ul>{!data.items.length&&<p>No staff follow-ups recorded.</p>}<div className="flex gap-2"><Button variant="outline" disabled={busy||data.page<=1} onClick={()=>void request('read',data.page-1)}>Previous notes</Button><span>Page {data.page}</span><Button variant="outline" disabled={busy||data.page*25>=data.total} onClick={()=>void request('read',data.page+1)}>Next notes</Button></div></>}
 </section>;
}
