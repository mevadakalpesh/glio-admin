import {Textarea} from '@/components/ui/textarea';
import {useEffect,useRef,useState} from 'react';
import {api,ApiError} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Preview={preview_id:string;attempts:number;additional_attempts:number;reason:string;expires_at:string};
export function NotificationRetry({id,onQueued}:{id:string;onQueued:()=>void}){
 const {session}=useAuth(),[reason,setReason]=useState(''),[preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(false),pending=useRef<AbortController|null>(null),operation=useRef<string|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('notifications.delivery.retry'))return null;
 async function run(confirm=false){if(!session||pending.current||confirm&&!preview)return;const c=new AbortController();pending.current=c;setBusy(true);setError('');try{
 if(confirm){operation.current ||=crypto.randomUUID();setRetry(true);await api(`/notification-delivery/${id}/retry`,{method:'POST',csrf:session.csrf_token,signal:c.signal,body:{preview_id:preview!.preview_id,operation_id:operation.current}});if(pending.current===c)onQueued();}
 else{const p=await api<Preview>(`/notification-delivery/${id}/retry-preview`,{method:'POST',csrf:session.csrf_token,signal:c.signal,body:{reason:reason.trim()}});if(pending.current===c){setPreview(p);setRetry(false);operation.current=null;}}
 }catch(e){if(pending.current===c){setError(e instanceof Error?e.message:'Retry unavailable.');if(e instanceof ApiError&&[400,409].includes(e.status)){setRetry(false);operation.current=null;}}}finally{if(pending.current===c){pending.current=null;setBusy(false);}}}
 return <section aria-label="Notification retry" className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Authorize one extra attempt</h3><p className="text-sm text-slate-600">Automatic retries are exhausted. This reuses the existing notification; it does not restart the ride or confirm delivery. A previous provider timeout may still have delivered a push, so a duplicate is possible.</p>{!preview?<><label className="block">Retry reason<Textarea disabled={busy} className="mt-1 block w-full rounded border p-2" maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label><Button disabled={busy||reason.trim().length<10} onClick={()=>void run()}>Preview extra attempt</Button></>:<><p>{preview.attempts} recorded attempts · {preview.additional_attempts} additional attempt</p><p>{preview.reason}</p><p className="text-sm">Preview expires {new Date(preview.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST.</p><div className="flex gap-3"><Button disabled={busy} onClick={()=>void run(true)}>{retry?'Retry same authorization':'Queue extra attempt'}</Button><Button variant="outline" disabled={busy||retry} onClick={()=>setPreview(null)}>Back to reason</Button></div></>}{error&&<p role="alert">{error}</p>}</section>;
}
