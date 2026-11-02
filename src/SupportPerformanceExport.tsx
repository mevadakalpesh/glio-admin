import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Range={from:string;to:string};
type Export={csv:string;filename:string;generated_at:string};
export function SupportPerformanceExport({filters}:{filters:Range}){
 const {session}=useAuth(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),pending=useRef<AbortController|null>(null);
 const permitted=session?.staff.permissions.includes('support.tickets.read')&&session.staff.permissions.includes('reports.export');
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!permitted)return null;
 async function download(){
  if(!session||pending.current||reason.trim().length<10)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setMessage('');
  try {
   const data=await api<Export>('/support-tickets/performance/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters,reason:reason.trim()}});
   if(pending.current!==controller)return;
   if(typeof data.csv!=='string'||!data.csv.startsWith('\ufeff')||!/^gilo-support-performance-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/.test(data.filename)||!Number.isFinite(Date.parse(data.generated_at)))throw Error('The export response was incomplete. Please try again.');
   const url=URL.createObjectURL(new Blob([data.csv],{type:'text/csv;charset=utf-8;'}));
   const link=document.createElement('a');
   try {link.href=url;link.download=data.filename;document.body.appendChild(link);link.click();}
   finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
   setMessage(`Download requested. This fresh report was generated at ${new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST; its totals may differ from the displayed snapshot.`);
  } catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Export unavailable. Please try again.');}
  finally {if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className="space-y-3 rounded-lg border p-4" aria-label="Support report export"><h3 className="font-semibold">Export support performance</h3><p className="text-sm">Exports the displayed creation period ({filters.from} through {filters.to}, IST) using a fresh, audited snapshot. Includes aggregate counts, timing definitions and daily intake; no customer messages, names or ticket references.</p><label className="block">Support export reason<Input className="mt-1 block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<Button disabled={busy||reason.trim().length<10} onClick={()=>void download()}>{busy?'Preparing support export…':'Download support CSV'}</Button></section>;
}
