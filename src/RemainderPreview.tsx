import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {Button} from '@/components/ui/button';
import {RemainderAllocation,type RemainderAmounts} from './RemainderAllocation';
import {RefundProposalSubmit} from './RefundProposalSubmit';
type Preview={allocation:RemainderAmounts;preview_token:string;expires_at:string;reason:string};
export function RemainderPreview({id,onProposed}:{id:string;onProposed:()=>void}){
 const {session}=useAuth();const [reason,setReason]=useState(''),[outcome,setOutcome]=useState('refund_rider'),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(()=>Date.now());
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(timer);pending.current?.abort();pending.current=null;};},[]);
 if(!session?.staff.permissions.includes('cases.wallet-refund.preview'))return null;
 async function prepare(){
  if(!session||pending.current)return;const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{const result=await api<Preview>(`/ride-cases/${encodeURIComponent(id)}/remainder-preview`,{method:'POST',csrf:session.csrf_token,body:{outcome,reason:reason.trim()},signal:controller.signal});if(pending.current===controller){setNow(Date.now());setPreview(result);}}
  catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Preview unavailable.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="text-lg font-semibold">Propose a remaining-balance decision</h2><p className="text-sm text-slate-600">For the assigned reviewer after a partial wallet refund. Another authorized staff member must approve. No funds move when you submit.</p>
 {error&&<p role="alert" className="text-red-800">{error}</p>}
 {!preview&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();void prepare();}}><label className="block text-sm">Remainder outcome<NativeSelect disabled={busy} className="mt-2 block w-full rounded border p-2" value={outcome} onChange={e=>setOutcome(e.target.value)}><option value="refund_rider">Refund remainder to rider</option><option value="settle_traveler">Settle remainder with traveler</option></NativeSelect></label><label className="block text-sm">Decision rationale<Textarea disabled={busy} className="mt-2 block w-full rounded border p-2" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} required /></label><Button type="submit" disabled={busy||reason.trim().length<10}>{busy?'Preparing…':'Preview remaining-balance decision'}</Button></form>}
 {preview&&<><RemainderAllocation value={preview.allocation}/><p className="text-sm">{now>=Date.parse(preview.expires_at)?'Preview expired. Refresh this case to prepare a new preview.':'Preview valid for up to five minutes; submission rechecks the financial records.'}</p><RefundProposalSubmit caseId={id} token={preview.preview_token} amount={preview.allocation.remaining_held_paise} allocation={preview.allocation} reason={preview.reason} expired={now>=Date.parse(preview.expires_at)} onSaved={onProposed}/></>}
 {!preview&&busy&&<Button variant="outline" onClick={()=>{pending.current?.abort();pending.current=null;setBusy(false);}}>Cancel preview</Button>}
 </section>;
}
