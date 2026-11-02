import {useCatalogBusy} from './useCatalogBusy';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {Button} from '@/components/ui/button';
type Proposal={id:string;actor_id:string;created_at:string;before:number;after:number;reason:string;state:string;review_reason:string|null;reviewer_id:string|null};
type Data={item:{revision:string;is_active:boolean;surcharge_percent:string};items:Proposal[];has_more:boolean};
type Preview={preview_id:string;before:number;after:number;reason:string;expires_at:string;example:{base:number;before_total:number;after_total:number}};
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n);
export function LuggageSurchargeEditor({id,label,onClose,onChanged}:{id:number;label:string;onClose:()=>void;onChanged:()=>void}){
 const {session}=useAuth();
 if(!session?.staff.permissions.includes('master-data.write'))return null;
 return <Editor key={`${id}:${session.csrf_token}`} id={id} label={label} csrf={session.csrf_token} staffId={session.staff.id} onClose={onClose} onChanged={onChanged}/>;
}
function Editor({id,label,csrf,staffId,onClose,onChanged}:{id:number;label:string;csrf:string;staffId:string;onClose:()=>void;onChanged:()=>void}){
 const [version,setVersion]=useState(0),[page,setPage]=useState(1),[amount,setAmount]=useState(''),[reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[attempted,setAttempted]=useState(false);
 const [decision,setDecision]=useState<{id:string;action:string}|null>(null),[reviewReason,setReviewReason]=useState('');
 const pending=useRef<AbortController|null>(null),operation=useRef<string|null>(null);
 const result=useRead<Data>(`/catalog/luggage/${id}/surcharge?page=${page}`,version);
 useCatalogBusy(busy);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function run(action:'preview'|'propose'|'decide'){
  if(pending.current||action==='preview'&&!result?.data||action==='propose'&&!preview||action==='decide'&&!decision)return;
  const c=new AbortController();pending.current=c;setBusy(true);setError('');setNotice('');
  try{
   if(action==='preview'){
    const p=await api<Preview>(`/catalog/luggage/${id}/surcharge-preview`,{method:'POST',csrf,signal:c.signal,body:{revision:result!.data!.item.revision,surcharge_percent:Number(amount),reason}});
    if(pending.current===c){setPreview(p);setAttempted(false);operation.current=null;}
   }else{
    if(action==='propose'){operation.current ||=crypto.randomUUID();setAttempted(true);await api(`/catalog/luggage/${id}/surcharge`,{method:'POST',csrf,signal:c.signal,body:{preview_id:preview!.preview_id,operation_id:operation.current}});}
    else await api(`/catalog/luggage/${id}/surcharge/${decision!.id}/decision`,{method:'POST',csrf,signal:c.signal,body:{action:decision!.action,reason:reviewReason}});
    if(pending.current===c){setPreview(null);setDecision(null);setReviewReason('');setPage(1);setVersion(v=>v+1);setNotice(action==='propose'?'Proposal submitted. A different owner must review it.':'Decision recorded. Approved changes remain inactive until separately activated.');onChanged();}
   }
  }catch(e){if(pending.current===c)setError(e instanceof Error?e.message:'Unable to update surcharge.');}
  finally{if(pending.current===c){pending.current=null;setBusy(false);}}
 }
 return <section aria-label="Luggage surcharge" className="space-y-4 rounded-xl border bg-white p-5">
  <div className="flex justify-between gap-3"><h2 className="text-lg font-semibold">Luggage surcharge · {label}</h2><Button disabled={busy} variant="outline" onClick={onClose}>Close surcharge</Button></div>
  <p className="text-sm text-slate-600">Deactivate the option and resolve open rides and bookings before proposing a new surcharge. A different owner must approve it. Existing paid fares are unchanged; activation is a separate step.</p>
  {!result&&<p role="status">Loading surcharge history…</p>}{result?.error&&<p role="alert">{result.error}</p>}
  <Button variant="outline" disabled={busy} onClick={()=>{setPreview(null);setDecision(null);setVersion(v=>v+1);}}>Refresh surcharge history</Button>
  {notice&&<p role="status" className="rounded bg-emerald-50 p-3">{notice}</p>}{error&&<p role="alert" className="rounded bg-red-50 p-3">{error}</p>}
  {result?.data&&<><p>Stored surcharge: <strong>{result.data.item.surcharge_percent}%</strong> · {result.data.item.is_active?'Active':'Inactive'}</p>
   {preview?<div className="space-y-3 rounded border p-4"><h3 className="font-semibold">Review surcharge proposal</h3><p>{preview.before}% → {preview.after}%</p><p>Example on {money(preview.example.base)}: {money(preview.example.before_total)} → {money(preview.example.after_total)} before other fare adjustments. This is not a checkout quote.</p><p>Reason: {preview.reason}</p><p className="text-sm">Preview expires {new Date(preview.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST.</p><div className="flex gap-3"><Button disabled={busy} onClick={()=>void run('propose')}>{attempted?'Retry same proposal':'Submit for approval'}</Button><Button variant="outline" disabled={busy||attempted} onClick={()=>setPreview(null)}>Back to edit</Button></div></div>:<form className="space-y-3" onSubmit={e=>{e.preventDefault();void run('preview');}}>
    <label className="block">New surcharge (%)<Input className="mt-2 block rounded border p-2" type="number" min={0} max={100} step="0.01" required disabled={busy||result.data.item.is_active} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <label className="block">Reason for surcharge change<Textarea className="mt-2 block w-full rounded border p-2" minLength={10} maxLength={500} required disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></label>
    <Button type="submit" disabled={busy||result.data.item.is_active}>Preview surcharge</Button>
   </form>}
   <h3 className="font-semibold">Proposals and decisions</h3>{!result.data.items.length&&<p>No surcharge proposals recorded.</p>}
   {result.data.items.map(p=><article key={p.id} className="space-y-2 rounded border p-4"><p className="font-medium">{p.before}% → {p.after}% · {p.state}</p><p className="text-sm">{new Date(p.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST · Proposed by {p.actor_id}</p><p>{p.reason}</p>{p.review_reason&&<p>Review by {p.reviewer_id}: {p.review_reason}</p>}{p.state==='pending'&&<div className="flex gap-3">{(p.actor_id===staffId?['withdraw']:['approve','reject']).map(a=><Button key={a} variant="outline" disabled={busy} onClick={()=>{setDecision({id:p.id,action:a});setReviewReason('');}}>{a==='approve'?'Approve surcharge':a==='reject'?'Reject proposal':'Withdraw proposal'}</Button>)}</div>}</article>)}
   {decision&&<form className="space-y-3 rounded border border-amber-200 p-4" onSubmit={e=>{e.preventDefault();void run('decide');}}><p className="font-semibold">Confirm {decision.action}</p><label className="block">Review reason<Textarea className="mt-2 block w-full rounded border p-2" required minLength={10} maxLength={500} disabled={busy} value={reviewReason} onChange={e=>setReviewReason(e.target.value)}/></label><Button disabled={busy} type="submit">Confirm decision</Button><Button disabled={busy} variant="ghost" type="button" onClick={()=>setDecision(null)}>Cancel decision</Button></form>}
   <div className="flex justify-between"><Button disabled={busy||page===1} onClick={()=>setPage(p=>p-1)}>Previous proposals</Button><span>Page {page}</span><Button disabled={busy||!result.data.has_more} onClick={()=>setPage(p=>p+1)}>Next proposals</Button></div>
  </>}
 </section>;
}
