import {Input} from '@/components/ui/input';
import {useEffect, useRef, useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';

type Content = {category:string; question:string; answer:string; sort_order:number};
type Topic = Content & {id:string; version:number; published:Content|null};
type Revision = {id:string; actor_id:string; action:string; created_at:string; reason:string; version:number; draft:Content|null; published:Content|null};
type History = {items:Revision[]; page:number; has_more:boolean};
const labels:Record<string,string> = {'help.topic_save':'Draft saved','help.topic_publish':'Published','help.topic_unpublish':'Unpublished','help.topic_restore':'Draft restored'};
function Preview({title,content}:{title:string;content:Content|null}) {
 return <section className="rounded-lg bg-slate-50 p-3"><h3 className="font-semibold">{title}</h3>{content?<><p className="text-sm text-slate-600">{content.category} · Display order {content.sort_order}</p><p className="font-medium">{content.question}</p><p className="whitespace-pre-wrap">{content.answer}</p></>:<p>No available content.</p>}</section>;
}
export function HelpTopicHistory({topic,close,restored}:{topic:Topic;close:()=>void;restored:()=>void}) {
 const {session}=useAuth();
 const [reason,setReason]=useState(''),[restoreReason,setRestoreReason]=useState(''),[data,setData]=useState<History|null>(null),[selected,setSelected]=useState<Revision|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 async function load(page:number) {
  if(!session||pending.current)return;
  const c=new AbortController();pending.current=c;setBusy(true);setError('');setData(null);setSelected(null);
  try {const result=await api<History>(`/help-topics/${encodeURIComponent(topic.id)}/history`,{method:'POST',csrf:session.csrf_token,signal:c.signal,body:{page,reason:reason.trim()}});if(pending.current===c)setData(result);}
  catch(e){if(pending.current===c)setError(e instanceof Error?e.message:'History could not be loaded. Try again.');}
  finally {if(pending.current===c){pending.current=null;setBusy(false);}}
 }
 async function restore() {
  if(!session||!selected||pending.current||uncertain)return;
  const c=new AbortController();pending.current=c;setBusy(true);setError('');
  try {await api(`/help-topics/${encodeURIComponent(topic.id)}`,{method:'POST',csrf:session.csrf_token,signal:c.signal,body:{action:'restore',version:topic.version,revision_id:selected.id,reason:restoreReason.trim()}});if(pending.current===c)restored();}
  catch(e){if(pending.current===c){setError((e instanceof Error?e.message:'Restore could not be confirmed.')+' Close history and refresh topics before trying again.');setUncertain(true);}}
  finally {if(pending.current===c){pending.current=null;setBusy(false);}}
 }
 const same=selected?.draft&&(['category','question','answer','sort_order'] as const).every(k=>selected.draft![k]===topic[k]);
 return <section aria-label="Help topic history" className="space-y-4 rounded-xl border border-emerald-300 bg-white p-4">
  <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Revision history · {topic.id}</h2><Button variant="outline" onClick={close}>Close history</Button></div>
  <p>Review an earlier saved draft before restoring. Restoring creates a new draft version; the published answer stays unchanged. Initial seeded content may have no recorded revision.</p>
  <label className="block">History review reason<Input className="block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>
  <Button variant="outline" disabled={busy||reason.trim().length<10} onClick={()=>void load(1)}>Load revision history</Button>
  {busy&&<p role="status">Processing…</p>}{error&&<p role="alert">{error}</p>}
  {data&&<><p>Page {data.page}. New changes may shift page order; reload the first page to see the latest history.</p>{!data.items.length&&<p>No recorded revisions on this page.</p>}<div className="space-y-3">{data.items.map(r=><article key={r.id} className="rounded-lg border p-3"><h3 className="font-semibold">Version {r.version} · {labels[r.action]||'Content change'}</h3><p>{new Date(r.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p className="break-all text-xs text-slate-600">Staff reference: {r.actor_id}</p><p className="whitespace-pre-wrap">{r.reason}</p><Button variant="outline" disabled={busy||!r.draft} onClick={()=>{setSelected(r);setRestoreReason('');}}>Compare version {r.version}</Button>{!r.draft&&<p>This revision has no valid draft to restore.</p>}</article>)}</div><div className="flex gap-3"><Button variant="outline" disabled={busy||data.page===1||reason.trim().length<10} onClick={()=>void load(data.page-1)}>Previous revisions</Button><Button variant="outline" disabled={busy||!data.has_more||reason.trim().length<10} onClick={()=>void load(data.page+1)}>Next revisions</Button></div></>}
  {selected&&<><div className="grid gap-3 md:grid-cols-2"><Preview title={`Earlier draft · version ${selected.version}`} content={selected.draft}/><Preview title={`Current draft · version ${topic.version}`} content={topic}/></div><Preview title="Current published answer · remains unchanged" content={topic.published}/><label className="block">Restore reason<Input className="block w-full rounded border p-2" value={restoreReason} maxLength={500} disabled={busy||uncertain} onChange={e=>setRestoreReason(e.target.value)}/></label>{same&&<p>This content already matches the current draft.</p>}<Button disabled={busy||uncertain||!!same||selected.version>=topic.version||restoreReason.trim().length<10} onClick={()=>void restore()}>Restore as draft</Button></>}
 </section>;
}
