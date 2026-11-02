import {Textarea} from '@/components/ui/textarea';
import {DatePicker} from '@/components/ui/date-picker';
import {NativeSelect} from '@/components/ui/native-select';
import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
export function VerificationDecision({kind,id,revision,requiresExpiry,onDone}:{kind:string;id:string;revision:string;requiresExpiry:boolean;onDone:()=>void}){
 const {session}=useAuth();const [decision,setDecision]=useState('correction_requested');const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null),attempt=useRef<{payload:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('verification.decide'))return null;
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(pending.current||!session)return;
  const form=new FormData(e.currentTarget);const body={revision,decision,reason:String(form.get('reason')||'').trim(),expires_on:decision==='approved'?String(form.get('expires_on')||'')||null:null};
  const fingerprint=JSON.stringify(body);if(attempt.current?.payload!==fingerprint)attempt.current={payload:fingerprint,id:crypto.randomUUID()};
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{await api(`/verification/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/decision`,{method:'POST',csrf:session.csrf_token,body:{...body,request_id:attempt.current.id},signal:controller.signal});if(pending.current===controller)onDone();}
  catch(err){if(pending.current===controller)setError(err instanceof Error?err.message:'Could not record the decision.');}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <form onSubmit={submit} className="mt-4 space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Manual review decision</h3>
 <p className="text-xs leading-5 text-slate-600">Open all available evidence before approval. This records a staff review, not a government or provider verification. Replaced evidence and expired documents require review again. Recording a decision does not cancel an active journey.</p>
 {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
 <label className="block text-sm">Decision<NativeSelect aria-label="Manual decision" value={decision} disabled={busy} onChange={e=>setDecision(e.target.value)} className="mt-1 block w-full rounded border p-2"><option value="correction_requested">Request correction</option><option value="rejected">Reject documents</option><option value="approved">Approve manual review</option></NativeSelect></label>
 {decision==='approved'&&<div className="block text-sm"><label htmlFor="date-verificationdecision-20">Document expiry date{requiresExpiry?' (required)':' (if applicable)'}</label><DatePicker id="date-verificationdecision-20" name="expires_on" type="date" required={requiresExpiry} disabled={busy} className="mt-1 block w-full rounded border p-2"/></div>}
 <label className="block text-sm">Review reason<Textarea name="reason" required minLength={5} maxLength={500} disabled={busy} className="mt-1 block w-full rounded border p-2"/></label>
 <Button type="submit" disabled={busy}>{busy?'Recording…':'Record manual decision'}</Button></form>;
}
