import {Switch} from '@/components/ui/switch';
import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Policy={enabled:boolean;target_minutes:number;version:number};
export function SupportResponsePolicy(){
 const {session}=useAuth();return session?.staff.role==='owner'?<OwnerPolicy/>:<p>Only an owner can configure first-response monitoring.</p>;
}
function OwnerPolicy(){
 const [tick,setTick]=useState(0),[notice,setNotice]=useState('');
 const result=useRead<Policy>('/support-response-policy',tick);
 return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="text-lg font-semibold">First-response monitoring</h2><p>Continuous elapsed time from ticket creation, including nights and weekends. Only a recorded customer-visible staff reply or resolution counts as the first response. Assignment, notes and acknowledgement do not stop the timer.</p><p>The current target applies to all existing unanswered active tickets. This is an internal queue target, not a promised customer response time. Previously answered tickets use the customer follow-up workflow if reopened.</p><Button variant="outline" onClick={()=>{setNotice('');setTick(n=>n+1);}}>Refresh response policy</Button>{notice&&<p role="status">{notice}</p>}{!result&&<p>Loading policy…</p>}{result?.error&&<p role="alert">{result.error}</p>}{result?.data&&<PolicyForm key={tick+':'+result.data.version} policy={result.data} saved={()=>{setNotice('Response policy saved. Refresh the ticket queue to see the current deadlines.');setTick(n=>n+1);}}/>}</section>;
}
function PolicyForm({policy,saved}:{policy:Policy;saved:()=>void}){
 const {session}=useAuth(),[enabled,setEnabled]=useState(policy.enabled),[minutes,setMinutes]=useState(String(policy.target_minutes)),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function save(e:React.FormEvent){
  e.preventDefault();if(!session||pending.current||uncertain)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{await api('/support-response-policy',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{enabled,target_minutes:Number(minutes),version:policy.version,reason:reason.trim()}});if(pending.current===controller)saved();}
  catch(e){if(pending.current===controller){setError((e instanceof Error?e.message:'Policy save could not be confirmed.')+' Refresh the policy before trying again.');setUncertain(true);}}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }

 return <form onSubmit={e=>void save(e)} className="space-y-3"><p>Saved policy: {policy.enabled?'Enabled':'Disabled'} · Version {policy.version}</p><label htmlFor="SupportResponsePolicy-enabled" className="flex items-center gap-2"><Switch id="SupportResponsePolicy-enabled" checked={enabled} disabled={busy||uncertain} onCheckedChange={setEnabled}/>Enable first-response target</label><label className="block">Target minutes from ticket creation<Input className="block rounded border p-2" type="number" min={1} max={10080} step={1} value={minutes} disabled={busy||uncertain} onChange={e=>setMinutes(e.target.value)}/></label><label className="block">Policy change reason<Input className="block w-full rounded border p-2" value={reason} maxLength={500} disabled={busy||uncertain} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<Button disabled={busy||uncertain||!minutes||!Number.isInteger(Number(minutes))||Number(minutes)<1||Number(minutes)>10080||reason.trim().length<10||(policy.version>0&&enabled===policy.enabled&&Number(minutes)===policy.target_minutes)} type="submit">{busy?'Saving policy…':'Save response policy'}</Button><p className="text-xs">Disabling hides target deadlines and overdue flags; the waiting queue remains available. Changing the target recalculates current deadlines without rewriting historical response-time reports. No email/SMS is sent and no ticket, journey or payment status is changed.</p></form>;
}
