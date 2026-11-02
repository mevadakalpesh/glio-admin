import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
export function CaseIntake({rideId}:{rideId:string}){
 const {session}=useAuth();const [open,setOpen]=useState(false),[kind,setKind]=useState('pickup_problem'),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[caseId,setCaseId]=useState(''),[revision,setRevision]=useState('');
 const pending=useRef<AbortController|null>(null),operation=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('cases.create'))return null;
 async function submit(){
  if(pending.current||!session)return;
  const key=JSON.stringify([kind,description.trim()]);if(operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{const result=await api<{case_id?:string;revision?:string}>(`/rides/${encodeURIComponent(rideId)}/report-case`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{action:revision?'report':'preview',...(revision?{revision}:{}),kind,description:description.trim(),operation_id:operation.current.id}});if(pending.current===controller){if(result.case_id)setCaseId(result.case_id);else if(result.revision)setRevision(result.revision);}}
  catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Could not record the issue. Retry with the same details.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 if(caseId)return <p role="status" className="rounded border bg-emerald-50 p-4">Incident recorded. <Link className="underline" to={`/support?case=${encodeURIComponent(caseId)}`}>Open case for review</Link></p>;
 return <section className="mb-4 rounded-xl border bg-white p-4"><Button variant="outline" onClick={()=>setOpen(!open)} disabled={busy}>{open?'Hide incident form':'Report ride issue'}</Button>{open&&<form className="mt-3 space-y-3" onSubmit={e=>{e.preventDefault();void submit();}}>
 <p className="text-sm">Record reported facts, not an assumed fault. This uses Gilo’s incident policy: eligible funds may be held for review and safety/interruption reports may hide the trip from new matching. New cases queue participant notices. It does not confirm exit, complete the journey or issue a refund. An existing open case may be reused or escalated.</p>
 <label className="block">Issue type<NativeSelect className="m-2 rounded border p-2" value={kind} disabled={busy} onChange={e=>{setKind(e.target.value);setRevision('');}}>{[['pickup_problem','Pickup problem'],['interrupted','Journey interrupted'],['safety','Safety concern'],['fare_dispute','Fare dispute']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</NativeSelect></label>
 <label className="block">Reported facts<Textarea className="mt-1 block w-full rounded border p-2" required minLength={10} maxLength={2000} value={description} disabled={busy} onChange={e=>{setDescription(e.target.value);setRevision('');}}/></label>
 <p className="text-xs text-slate-500">Staff attribution is recorded separately. Do not include OTPs or payment credentials. Claim the case after opening it to continue follow-up.</p>
 {revision&&<p role="status">Server preview checked. Confirm to apply the incident policy described above.</p>}{error&&<p role="alert">{error}</p>}<Button type="submit" disabled={busy||description.trim().length<10}>{busy?'Checking incident…':revision?'Confirm incident':'Preview incident'}</Button>
 {revision&&<Button type="button" variant="ghost" disabled={busy} onClick={()=>setRevision('')}>Refresh preview</Button>}</form>}</section>;
}
