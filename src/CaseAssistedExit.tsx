import {Input} from '@/components/ui/input';
import {NativeSelect} from '@/components/ui/native-select';
import {Textarea} from '@/components/ui/textarea';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {indiaTimeToUtc} from './trackingWindow';
import {Button} from '@/components/ui/button';
type Cursor={id:string;at:string};
type Proposal={id:string;by_you:boolean;method:string;confirmed_at:string;note:string;status:string;stale:boolean;decision?:{note:string;at:string;by_you:boolean}|null};
export function CaseAssistedExit({id,onChanged}:{id:string;onChanged?:(message:string)=>void}){
 const {session}=useAuth();const [reason,setReason]=useState(''),[method,setMethod]=useState('phone'),[when,setWhen]=useState(''),[attested,setAttested]=useState(false),[items,setItems]=useState<Proposal[]|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [next,setNext]=useState<Cursor|null>(null);
 const pending=useRef<AbortController|null>(null),operation=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('cases.exit.manage'))return null;
 async function send(action:string,proposal_id?:string,before?:Cursor){if(pending.current||!session)return;
  const confirmed_at=indiaTimeToUtc(when);if(action==='propose'&&!confirmed_at){setMessage('Enter a valid passenger confirmation time in IST.');return;}
  const key=JSON.stringify([reason.trim(),method,confirmed_at]);if(action==='propose'&&operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');setItems(null);setNext(null);
  try{const result=await api<{items?:Proposal[];outcome?:string;next?:Cursor|null}>(`/ride-cases/${encodeURIComponent(id)}/exit-proposals`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{action,...(before?{before}:{}),reason:reason.trim(),...(proposal_id?{proposal_id}:{}),...(action==='propose'?{method,confirmed_at,attested,operation_id:operation.current!.id}:{})}});
   if(pending.current!==controller)return;
   if(result.items){setItems(result.items);setNext(result.next||null);}else {setMessage(action==='propose'?'Proposal recorded. A different owner or safety staff member must review it.':result.outcome==='approved'?'Assisted exit recorded. Ride remains disputed; no money was moved. Refresh the case for current status.':result.outcome==='withdrawn'?'Proposal withdrawn. Ride unchanged.':'Proposal rejected. Ride unchanged.');if(action==='propose'){operation.current=null;setAttested(false);}if(action!=='read')onChanged?.(result.outcome==='approved'?'Passenger exit recorded. Ride remains disputed; no money was moved.':'Exit proposal updated. Ride and funds unchanged.');}
  }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Unable to process assisted exit.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Assisted passenger exit</h2><p className="text-sm">Use only after direct confirmation from the passenger by phone or in person. GPS and a traveler statement are insufficient. Confirmation must be within 30 minutes. A different owner or safety staff member must approve. Approval releases the seat once and marks the ride disputed; it does not settle payment or complete the trip.</p>
 <label className="block">Assisted-exit reason and evidence<Textarea className="mt-1 block w-full rounded border p-2" maxLength={1000} disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send('read')}>Review exit proposals</Button>
 <details><summary className="cursor-pointer font-medium">Record direct passenger confirmation</summary><p className="my-2 text-xs">Claim the case first. Withdraw your pending proposal if its details are incorrect; only one current proposal can await approval. Record how the passenger was contacted and what they confirmed; do not include OTPs or credentials.</p>
 <label className="block">Confirmation method<NativeSelect className="m-2 rounded border p-2" value={method} disabled={busy} onChange={e=>setMethod(e.target.value)}><option value="phone">Phone conversation with passenger</option><option value="in_person">In person with passenger</option></NativeSelect></label>
 <label className="block">Confirmation time (IST)<Input className="m-2 rounded border p-2" type="datetime-local" value={when} disabled={busy} onChange={e=>setWhen(e.target.value)}/></label>
 <label className="block"><input type="checkbox" checked={attested} disabled={busy} onChange={e=>setAttested(e.target.checked)}/> I directly confirmed with the passenger that they have left the vehicle.</label>
 <Button disabled={busy||!attested||!when||reason.trim().length<10} onClick={()=>void send('propose')}>Submit exit proposal</Button></details>
 {message&&<p role="status">{message}</p>}{items&&<><p className="text-xs">Up to 25 proposals per page, newest first. Approval rechecks the journey and confirmation age.</p>{!items.length&&<p>No exit proposals recorded.</p>}{items.map(p=><article className="space-y-2 rounded border p-3" key={p.id}><p>{p.by_you?'Your proposal':'Another staff member’s proposal'} · {p.status}{p.stale?' · needs new confirmation':''}</p><p>{p.method} · {new Date(p.confirmed_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p>{p.note}</p>{p.decision&&<div className="rounded bg-slate-50 p-3 text-sm"><p>{p.decision.by_you?"Your decision":"Staff decision"} · {new Date(p.decision.at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST</p><p>{p.decision.note}</p></div>}{p.status==='pending'&&p.by_you&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send('withdraw',p.id)}>Withdraw proposal</Button>}{p.status==='pending'&&!p.by_you&&<div className="flex gap-2"><Button disabled={busy||p.stale||reason.trim().length<10} onClick={()=>void send('approve',p.id)}>Approve assisted exit</Button><Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send('reject',p.id)}>Reject proposal</Button></div>}</article>)}{next&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send("read",undefined,next)}>Older proposals</Button>}</>}
 </section>;
}
