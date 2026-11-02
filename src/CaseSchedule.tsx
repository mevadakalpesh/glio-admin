import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {useAuth} from './useAuth';
import {api} from './api';
import {indiaTimeToUtc} from './trackingWindow';
import {Button} from '@/components/ui/button';
type Schedule={version:string|null;due_at:string|null;reason:string;overdue:boolean;active:boolean};
export function CaseSchedule({id}:{id:string}){
 const {session}=useAuth();const [reason,setReason]=useState(''),[when,setWhen]=useState(''),[data,setData]=useState<Schedule|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef<AbortController|null>(null),operation=useRef<{key:string;id:string}|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!session?.staff.permissions.includes('cases.description.read'))return null;
 async function send(action:string){if(pending.current||!session)return;
  const due_at=action==='schedule_set'?indiaTimeToUtc(when):null;
  if(action==='schedule_set'&&!due_at){setMessage('Enter a valid follow-up time in IST.');return;}
  const write=action!=='schedule_read',key=JSON.stringify([action,reason.trim(),due_at,data?.version]);
  if(write&&operation.current?.key!==key)operation.current={key,id:crypto.randomUUID()};
  const controller=new AbortController();pending.current=controller;setBusy(true);setMessage('');if(!write)setData(null);
  try{const result=await api<Schedule>(`/ride-cases/${encodeURIComponent(id)}/followups`,{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{action,reason:reason.trim(),...(write?{version:data?.version??null,operation_id:operation.current!.id,...(action==='schedule_set'?{due_at}:{})}:{})}});
   if(pending.current!==controller)return;
   if(write){setData(null);operation.current=null;setMessage('Follow-up schedule saved. No participant message or journey/payment change was made.');}else setData(result);
  }catch(e){if(pending.current===controller)setMessage(e instanceof Error?e.message:'Follow-up unavailable.');}finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-3 rounded-xl border bg-white p-5"><h2 className="font-semibold">Follow-up schedule</h2><p className="text-sm">Set a staff reminder for this case. Due times do not automatically cancel rides, move money or send notifications. Claim the case before changing its schedule.</p>
 <label className="block">Schedule review or change reason<Input className="block w-full rounded border p-2" maxLength={1000} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
 <Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send('schedule_read')}>Review follow-up schedule</Button>
 {data&&<div className="space-y-2"><p>{data.due_at?`Due ${new Date(data.due_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST${data.overdue&&data.active?' · Overdue':''}`:'No follow-up scheduled'}</p>{data.reason&&<p>{data.reason}</p>}{!data.active&&<p>This case is closed; its schedule is historical.</p>}
 {data.active&&session.staff.permissions.includes('cases.assign')&&<><label className="block">Follow-up time (IST)<Input className="m-2 rounded border p-2" type="datetime-local" value={when} disabled={busy} onChange={e=>setWhen(e.target.value)}/></label><p className="text-xs">Choose a future time within 30 days.</p><Button disabled={busy||!when||reason.trim().length<10} onClick={()=>void send('schedule_set')}>Save follow-up time</Button>{data.due_at&&<Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void send('schedule_clear')}>Clear follow-up time</Button>}</>}
 </div>}{message&&<p role="status">{message}</p>}</section>;
}
