import {useEffect,useRef,useState} from 'react';
import {Bell,Plus,RefreshCw,Send} from 'lucide-react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {api} from './api';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {DateTimePicker} from '@/components/ui/date-time-picker';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {AdminTable} from '@/components/ui/admin-table';
type Campaign={id:string;title:string;body:string;status:string;scheduled_at:string;counts:Record<string,number>|null};
type Draft={id:string;title:string;body:string;scheduled_at:string};
const time=(s:string)=>new Date(s).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
export function NotificationCampaigns(){
 const {session}=useAuth();
 return session?.staff.permissions.includes('notifications.campaigns.manage') ? <CampaignWorkspace/> : <p>You do not have access to campaigns.</p>;
}
function CampaignWorkspace(){
 const {session}=useAuth();const [version,refresh]=useState(0),[page,setPage]=useState(1),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[cancel,setCancel]=useState<Campaign|null>(null);
 const [draft,setDraft]=useState<Draft>({id:'',title:'',body:'',scheduled_at:''}),[schedule,setSchedule]=useState(false),[preview,setPreview]=useState<number|null>(null);
 const pending=useRef(false);
 const result=useRead<{items:Campaign[];has_more:boolean}>(`/notification-campaigns?page=${page}`,version);
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)refresh(v=>v+1);},15000);return()=>clearInterval(timer);},[]);
 function start(){setDraft({id:crypto.randomUUID(),title:'',body:'',scheduled_at:''});setPreview(null);setSchedule(false);setError('');setOpen(true);}
 async function submit(){if(pending.current||!session)return;pending.current=true;setBusy(true);setError('');try{
  if(schedule&&!draft.scheduled_at){setError('Choose a date and time.');return;}
  const body={...draft,scheduled_at:schedule?draft.scheduled_at:''};
  if(preview===null){const p=await api<{audience_count:number}>('/notification-campaigns/preview',{method:'POST',csrf:session.csrf_token,body});setPreview(p.audience_count);}
  else {await api('/notification-campaigns',{method:'POST',csrf:session.csrf_token,body});setOpen(false);setNotice(schedule?'Campaign scheduled.':'Campaign queued for background sending.');setPage(1);refresh(v=>v+1);}
 }catch(e){setError(e instanceof Error?e.message:'Could not save campaign.');}finally{pending.current=false;setBusy(false);}}
 async function stop(){if(!cancel||!session||pending.current)return;pending.current=true;setBusy(true);setError('');try{await api(`/notification-campaigns/${cancel.id}/cancel`,{method:'POST',csrf:session.csrf_token,body:{}});setCancel(null);setNotice('Campaign cancelled. Messages already sent cannot be recalled.');refresh(v=>v+1);}catch(e){setError(e instanceof Error?e.message:'Could not cancel campaign.');}finally{pending.current=false;setBusy(false);}}
 if(!session?.staff.permissions.includes('notifications.campaigns.manage'))return <p>You do not have access to campaigns.</p>;
 return <section className="space-y-6">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Notification campaigns</h1><p className="mt-1 text-sm text-muted-foreground">Share weekend updates, festival wishes and Gilo news.</p></div><div className="flex gap-2"><Button variant="outline" onClick={()=>refresh(v=>v+1)}><RefreshCw size={16}/>Refresh</Button><Button onClick={start}><Plus size={16}/>Create campaign</Button></div></header>
 {notice&&<p role="status" className="rounded-xl border bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
 <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Audience: active Gilo customers with promotional push enabled. Customer preferences are checked again before sending. Campaigns expire 24 hours after their scheduled time. All times are IST.</div>
 {!result&&<p role="status">Loading campaigns…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {result?.data&&<div className="overflow-hidden rounded-2xl border">
 {result.data.items.length===0?<div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><Bell size={32} className="text-muted-foreground"/><h2 className="font-semibold">No campaigns yet</h2><p className="text-sm text-muted-foreground">Create your first message and review it before sending.</p></div>:<AdminTable><thead><tr>{['Campaign','Scheduled (IST)','Status','Provider accepted','Skipped','Uncertain','Queued / sending','Actions'].map(h=><th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{result.data.items.map(c=><tr key={c.id} className="border-t"><td className="max-w-72 p-4"><p className="font-medium">{c.title}</p><p className="mt-1 break-words text-sm text-muted-foreground">{c.body}</p></td><td className="p-4 text-sm">{time(c.scheduled_at)}</td><td className="p-4 capitalize">{c.status}</td>{['sent','skipped','unknown'].map(k=><td key={k} className="p-4 tabular-nums">{c.counts?.[k]||0}</td>)}<td className="p-4">{(c.counts?.queued||0)+(c.counts?.sending||0)}</td><td className="p-4">{['running','scheduled'].includes(c.status)&&<Button variant="outline" onClick={()=>{setError('');setCancel(c);}}>Cancel</Button>}</td></tr>)}</tbody></AdminTable>}
 <footer className="flex items-center justify-between border-t p-4 text-sm"><span>Page {page}</span><div className="flex gap-2"><Button variant="outline" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</Button><Button variant="outline" disabled={!result.data.has_more} onClick={()=>setPage(p=>p+1)}>Next</Button></div></footer></div>}
 <p className="text-xs text-muted-foreground">Provider acceptance does not mean the customer read the message. Uncertain outcomes are not automatically resent. A completed campaign can include skipped or uncertain recipients.</p>
 <Dialog open={open} onOpenChange={v=>{if(!busy)setOpen(v);}}><DialogContent className="max-w-2xl"><DialogTitle className="text-xl font-semibold">{preview===null?'Create campaign':'Review campaign'}</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Send to all eligible customers. Up to five campaigns per day.</DialogDescription>
 {error&&<p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
 {preview===null?<form className="mt-6" onSubmit={e=>{e.preventDefault();void submit();}}><fieldset disabled={busy} className="space-y-5"><div><label htmlFor="campaign-title" className="mb-2 block text-sm font-medium">Title</label><Input id="campaign-title" required maxLength={80} value={draft.title} onChange={e=>setDraft(d=>({...d,title:e.target.value}))}/></div><div><label htmlFor="campaign-body" className="mb-2 block text-sm font-medium">Message</label><Textarea id="campaign-body" required maxLength={240} value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))}/><p className="mt-1 text-right text-xs text-muted-foreground">{draft.body.length}/240</p></div><div><label htmlFor="campaign-when" className="mb-2 block text-sm font-medium">When to send</label><NativeSelect id="campaign-when" value={schedule?'later':'now'} onChange={e=>setSchedule(e.target.value==='later')}><option value="now">Send now</option><option value="later">Schedule for later</option></NativeSelect></div>{schedule&&<DateTimePicker label="Send at (India time)" dateLabel="Send date" value={draft.scheduled_at} onChange={v=>setDraft(d=>({...d,scheduled_at:v}))}/>}<Button disabled={busy} type="submit">{busy?'Checking…':'Preview campaign'}</Button></fieldset></form>:<div className="mt-6 space-y-5"><div className="rounded-xl border bg-muted/30 p-5"><p className="mb-3 flex items-center gap-2 text-sm font-medium"><Bell size={16}/>Gilo</p><h2 className="break-words font-semibold">{draft.title}</h2><p className="mt-1 whitespace-pre-wrap break-words text-sm">{draft.body}</p></div><p className="text-sm"><strong>{preview.toLocaleString('en-IN')}</strong> eligible accounts now. Device availability and opt-outs may reduce actual sends. Only accounts existing when this campaign is saved are included.</p><p className="text-sm">{schedule?`Scheduled: ${time(draft.scheduled_at+'+05:30')}`:'Send now in background batches.'}</p><div className="flex justify-end gap-2"><Button variant="outline" disabled={busy} onClick={()=>{setPreview(null);setError('');}}>Edit</Button><Button disabled={busy||preview===0} onClick={()=>void submit()}><Send size={16}/>{busy?'Saving…':schedule?'Confirm schedule':'Confirm send'}</Button></div></div>}
 </DialogContent></Dialog>
 <Dialog open={!!cancel} onOpenChange={v=>{if(!busy&&!v)setCancel(null);}}><DialogContent><DialogTitle className="text-xl font-semibold">Cancel campaign?</DialogTitle><DialogDescription className="my-4">Stops remaining sends. Messages already sent or currently being submitted cannot be recalled.</DialogDescription>{error&&<p role="alert" className="mb-4 text-red-700">{error}</p>}<Button disabled={busy} onClick={()=>void stop()}>Confirm cancellation</Button></DialogContent></Dialog>
 </section>;
}
