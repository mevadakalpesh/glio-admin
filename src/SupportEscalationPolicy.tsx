import {Switch} from '@/components/ui/switch';
import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {api} from './api';
import {Button} from '@/components/ui/button';
type Policy={enabled:boolean;delay_minutes:number;version:number;last_scan_at:string|null;last_scan_count:number|null};
export function SupportEscalationPolicy(){
 const {session}=useAuth();return session?.staff.role==='owner'?<OwnerPolicy/>:<p>Only an owner can configure automatic support escalation.</p>;
}
function OwnerPolicy(){
 const [tick,setTick]=useState(0),[notice,setNotice]=useState('');
 const result=useRead<Policy>('/support-escalation-policy',tick);
 return <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="text-lg font-semibold">Automatic follow-up escalation</h2><p>Global policy for ride/trip support tickets. Only staff-set, unacknowledged overdue deadlines qualify. The worker checks every minute in batches of 100; timing is not an exact delivery guarantee.</p><p>Enabling or shortening the delay also applies to existing overdue tickets. Escalation adds an internal queue flag; it does not reassign, change priority, contact customers or change any journey or payment.</p><Button variant="outline" onClick={()=>{setNotice('');setTick(n=>n+1);}}>Refresh escalation policy</Button>{notice&&<p role="status">{notice}</p>}{!result&&<p>Loading policy…</p>}{result?.error&&<p role="alert">{result.error}</p>}{result?.data&&<PolicyForm key={tick+':'+result.data.version} policy={result.data} saved={()=>{setNotice('Escalation policy saved. Review the refreshed policy and scan status.');setTick(n=>n+1);}}/>}</section>;
}
function PolicyForm({policy,saved}:{policy:Policy;saved:()=>void}){
 const {session}=useAuth(),[enabled,setEnabled]=useState(policy.enabled),[minutes,setMinutes]=useState(String(policy.delay_minutes)),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const [snapshotAt]=useState(()=>Date.now());
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function save(e:React.FormEvent){
  e.preventDefault();if(!session||pending.current||uncertain)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{await api('/support-escalation-policy',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{enabled,delay_minutes:Number(minutes),version:policy.version,reason:reason.trim()}});if(pending.current===controller)saved();}
  catch(e){if(pending.current===controller){setError((e instanceof Error?e.message:'Policy save could not be confirmed.')+' Refresh the policy before trying again.');setUncertain(true);}}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 const stale=policy.enabled&&(!policy.last_scan_at||!Number.isFinite(Date.parse(policy.last_scan_at))||snapshotAt-Date.parse(policy.last_scan_at)>5*60000);
 return <form onSubmit={e=>void save(e)} className="space-y-3"><p>Saved policy: {policy.enabled?'Enabled':'Disabled'} · Version {policy.version}</p><p className="text-sm">Last successful scan: {policy.last_scan_at?new Date(policy.last_scan_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Not recorded'} · Escalations in that scan: {policy.last_scan_count??'Not recorded'}</p>{stale&&<p className="text-amber-800">No recent successful scan is recorded in this snapshot. Refresh and check the automation service.</p>}<label htmlFor="SupportEscalationPolicy-enabled" className="flex items-center gap-2"><Switch id="SupportEscalationPolicy-enabled" checked={enabled} disabled={busy||uncertain} onCheckedChange={setEnabled}/>Enable automatic escalation</label><label className="block">Minutes after the follow-up deadline<Input className="block rounded border p-2" type="number" min={1} max={10080} step={1} value={minutes} disabled={busy||uncertain} onChange={e=>setMinutes(e.target.value)}/></label><label className="block">Policy change reason<Input className="block w-full rounded border p-2" value={reason} maxLength={500} disabled={busy||uncertain} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<Button disabled={busy||uncertain||!minutes||!Number.isInteger(Number(minutes))||Number(minutes)<1||Number(minutes)>10080||reason.trim().length<10||(policy.version>0&&enabled===policy.enabled&&Number(minutes)===policy.delay_minutes)} type="submit">{busy?'Saving policy…':'Save escalation policy'}</Button><p className="text-xs">Disabling stops new escalations. Existing escalations remain until staff acknowledge, reschedule or resolve their tickets. Acknowledgement records attention; it does not resolve the customer issue. No email/SMS is sent by this policy.</p></form>;
}
