import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {api,ApiError} from './api';
import {CircleAlert,Clock3} from 'lucide-react';
import {PolicyWorkspace} from './PolicyWorkspace';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {DateTimePicker} from '@/components/ui/date-time-picker';
const labels={identity_required:'Identity document approval',selfie_required:'Selfie approval',vehicle_required:'Vehicle and driving licence approval'};
type Values=Record<keyof typeof labels,boolean>;
const keys=Object.keys(labels) as (keyof Values)[];
type Item={id:string;version:number;state:string;effective_at:string;reason:string;values:Values;actor_id:string;review_reason:string|null};
type Snapshot={current:{version:number;values:Values};items:Item[];page:number;has_more:boolean};
type Preview={immediate?:boolean;preview_id:string;values:Values;current:Values;proposed:Values;effective_at:string;expires_at:string};
const stamp=(s:string)=>new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST';
function Rules({values}:{values:Values}){return <dl className="grid gap-4 sm:grid-cols-3">{keys.map(k=><div key={k} className="rounded-xl border p-4"><dt className="text-sm text-muted-foreground">{labels[k]}</dt><dd className="mt-2 font-semibold">{values[k]?'Required':'Not required'}</dd></div>)}</dl>;}
export function VerificationPolicies(){const {session}=useAuth();return session?.staff.permissions.includes('policies.read')?<Workspace/>:<p>You do not have access to verification settings.</p>;}
function Workspace(){const [page,setPage]=useState(1),[version,setVersion]=useState(0),result=useRead<Snapshot>(`/verification-policies?page=${page}`,version);
 if(!result)return <p role="status">Loading verification settings…</p>;
 if(result.error)return <p role="alert">{result.error}</p>;
 if(!result.data)return null;
 const data=result.data;
 return <PolicyWorkspace directOwner title="Verification settings" guidance="These settings apply in every environment at publication, trip start, matching and new booking checks. The owner can apply changes immediately or schedule activation; applying immediately replaces future scheduled verification settings. Changes are audited. Disabling a requirement does not approve documents or alter review history. Vehicle and licence uploads and safety flags remain mandatory. Existing passenger journeys remain accessible." current={<section className="space-y-3"><h2 className="font-semibold">Effective requirements · {data.current.version?`version ${data.current.version}`:'default rules'}</h2><Rules values={data.current.values}/></section>} items={data.items} page={page} hasMore={data.has_more} onPage={setPage} refresh={()=>setVersion(v=>v+1)} proposal={controls=><PolicyForm values={data.current.values} {...controls}/>} review={(item,controls)=><PolicyForm values={item.values} item={item} {...controls}/>}/>;
}
function PolicyForm({values:initial,item,done,onBusyChange}:{values:Values;item?:Item;done:()=>void;onBusyChange:(busy:boolean)=>void}){
 const {session}=useAuth(),[values,setValues]=useState(initial),[at,setAt]=useState(''),[scheduled,setScheduled]=useState(false),[reason,setReason]=useState(''),[action,setAction]=useState('approve'),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[fieldError,setFieldError]=useState(''),[dateError,setDateError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(false),pending=useRef<AbortController|null>(null),operation=useRef<string|null>(null);
 useEffect(()=>{onBusyChange(busy);},[busy,onBusyChange]);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 const mine=item?.actor_id===session?.staff.id;
 async function run(mode:'preview'|'submit'|'decision'){
  if(!session||pending.current)return;
  if(mode==='preview'&&scheduled){const date=new Date(at+':00+05:30');if(!at||!Number.isFinite(+date)||+date<=Date.now()||+date>Date.now()+366*86400000){setDateError('Choose a future date and time within one year (IST).');return;}}
  if(mode!=='preview'&&(reason.trim().length<10||reason.length>500||Array.from(reason).some(character=>character.charCodeAt(0)<32||character.charCodeAt(0)===127))){setFieldError('Enter a reason of 10–500 characters without line breaks.');document.getElementById('verification-policy-reason')?.focus();return;}
  setFieldError('');setDateError('');
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');
  try{
   if(mode==='preview'){
    const effective=new Date(at+':00+05:30');if(scheduled&&(!at||!Number.isFinite(effective.getTime())))throw Error('Choose an activation date and time in India time.');
    const p=await api<Preview>('/verification-policies/preview',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{values,sample:{},effective_at:scheduled?effective.toISOString():null}});
    if(pending.current!==controller)return;
    if(!p.preview_id||!keys.every(k=>typeof p.proposed?.[k]==='boolean')||!Number.isFinite(Date.parse(p.expires_at)))throw Error('Preview unavailable.');
    setPreview(p);
   }else{
    if(reason.trim().length<10)throw Error('Provide a reason of at least 10 characters.');
    if(mode==='submit'){
     if(!preview)return;operation.current ||=crypto.randomUUID();setRetry(true);
     await api('/verification-policies',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{preview_id:preview.preview_id,operation_id:operation.current,reason:reason.trim()}});
    }else await api(`/verification-policies/${item!.id}/decision`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{action,reason:reason.trim()}});
    if(pending.current===controller)done();
   }
  }catch(e){if(pending.current===controller){
    const definite=e instanceof ApiError&&e.status>=400&&e.status<500;
    if(definite){setRetry(false);operation.current=null;}
    const message=e instanceof Error?e.message:'Settings action unavailable.';
    setError(message.includes('pending proposal')?'An earlier settings change is still pending. Close this window and open its action menu in Settings history to approve or withdraw it, then try again.':message);
    requestAnimationFrame(()=>document.getElementById('verification-save-error')?.focus());
   }}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 const canDecide=item?.state==='pending'&&session?.staff.permissions.includes('policies.publish');
 return <div className="space-y-5">
  {error&&<div id="verification-save-error" role="alert" tabIndex={-1} className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 outline-none focus-visible:ring-2 focus-visible:ring-red-500"><CircleAlert size={18} className="mt-0.5 shrink-0"/><div><p className="font-semibold">Changes could not be saved</p><p className="mt-1 leading-relaxed">{error}</p>{retry&&<p className="mt-2">The result is not confirmed. Retry the same save to avoid creating a duplicate change.</p>}</div></div>}
  {!item&&!preview?<>
   <p className="text-sm leading-relaxed text-muted-foreground">Choose which manual approvals travelers need. Turning off a requirement does not mark their documents as approved.</p>
   <div className="divide-y rounded-xl border">{keys.map(k=><div key={k} className="flex items-center justify-between gap-4 px-4 py-4"><label htmlFor={`verification-${k}`} className="text-sm font-medium">{labels[k]}</label><Switch id={`verification-${k}`} checked={values[k]} disabled={busy} onCheckedChange={checked=>setValues(v=>({...v,[k]:checked}))}/></div>)}</div>
   <div className="space-y-2"><label className="text-sm font-medium" htmlFor="verification-activation">When to apply</label><NativeSelect id="verification-activation" value={scheduled?"scheduled":"now"} disabled={busy} onChange={e=>{setScheduled(e.target.value==="scheduled");setDateError('');}}><option value="now">Apply immediately</option><option value="scheduled">Schedule for later</option></NativeSelect></div>
   {!scheduled&&<p className="text-sm text-muted-foreground">Saving immediately replaces any future scheduled verification settings. They will remain in history as withdrawn.</p>}
   {scheduled&&<div className="space-y-2 rounded-xl border bg-muted/20 p-4"><DateTimePicker label="Activate at (India time)" value={at} onChange={value=>{setAt(value);setDateError('');}} disabled={busy}/>{dateError&&<p role="alert" className="text-sm text-red-700">{dateError}</p>}</div>}
   <div className="flex justify-end border-t pt-4"><Button disabled={busy} onClick={()=>void run('preview')}>{busy?'Preparing preview…':'Preview settings'}</Button></div>
  </>:<>
   {preview?<div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><caption className="sr-only">Current and proposed verification requirements</caption><thead className="bg-muted/40 text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Requirement</th><th className="px-4 py-3 font-medium">Current</th><th className="px-4 py-3 font-medium">After saving</th></tr></thead><tbody className="divide-y">{keys.map(k=><tr key={k}><th className="px-4 py-3 font-medium">{labels[k]}</th><td className="px-4 py-3 text-muted-foreground">{preview.current[k]?'Required':'Not required'}</td><td className="px-4 py-3 font-medium">{preview.proposed[k]?'Required':'Not required'}{preview.current[k]!==preview.proposed[k]&&<span className="ml-2 text-xs text-emerald-700">Changed</span>}</td></tr>)}</tbody></table></div>:<Rules values={item!.values}/>}
   <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-4 py-3 text-sm"><Clock3 size={16} className="shrink-0 text-muted-foreground"/><span>Activation: {preview?.immediate?'Immediately after saving':stamp(item?.effective_at||preview!.effective_at)}</span></div>
   {preview?.immediate&&<p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Any future scheduled verification settings will be replaced and will not activate later.</p>}
   {item&&<dl className="space-y-3 rounded-xl border p-4 text-sm"><div><dt className="text-muted-foreground">Original reason</dt><dd className="mt-1 break-words">{item.reason}</dd></div>{item.review_reason&&<div><dt className="text-muted-foreground">Decision reason</dt><dd className="mt-1 break-words">{item.review_reason}</dd></div>}</dl>}
   {(!item||canDecide)&&<div className="space-y-4">
    {item&&<div className="space-y-2"><label htmlFor="verification-decision" className="text-sm font-medium">Decision</label><NativeSelect id="verification-decision" value={action} disabled={busy||retry} onChange={e=>setAction(e.target.value)}><option value="approve">Approve scheduled settings</option><option value="reject">Reject proposal</option>{mine&&<option value="withdraw">Withdraw proposal</option>}</NativeSelect></div>}
    <div className="space-y-2"><label className="text-sm font-medium" htmlFor="verification-policy-reason">Reason</label><Textarea id="verification-policy-reason" rows={3} value={reason} required aria-invalid={!!fieldError} aria-describedby="verification-reason-help" disabled={busy||retry} maxLength={500} placeholder="Explain why these settings need to change…" onChange={e=>{setReason(e.target.value);setFieldError('');}} onBlur={()=>{if(reason&&reason.trim().length<10)setFieldError('Enter at least 10 characters to explain this change.');}}/><div className="flex justify-between gap-3 text-xs"><p id="verification-reason-help" className={fieldError?'text-red-700':'text-muted-foreground'}>{fieldError||'10–500 characters. Saved in the audit history.'}</p><span className="shrink-0 text-muted-foreground">{reason.length}/500</span></div></div>
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">{!item&&!retry&&<Button variant="outline" disabled={busy} onClick={()=>{setPreview(null);setError('');setFieldError('');}}>Edit settings</Button>}<Button disabled={busy} onClick={()=>void run(item?'decision':'submit')}>{busy?'Saving…':item?'Confirm decision':retry?'Retry same save':'Save settings'}</Button></div>
   </div>}
  </>}
 </div>;
}
