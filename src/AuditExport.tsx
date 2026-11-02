import {Input} from '@/components/ui/input';
import {useEffect,useRef,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Range=Record<string,string>;
type Export={csv:string;filename:string;generated_at:string};
export function AuditExport({filters,embedded=false}:{filters:Range;embedded?:boolean}){
 const {session}=useAuth(),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),pending=useRef<AbortController|null>(null);
 const permitted=session?.staff.permissions.includes('audit.read')&&session.staff.permissions.includes('audit.export');
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 if(!permitted)return null;
 async function download(){
  if(!session||pending.current||reason.trim().length<10||!filters.from||!filters.to)return;
  const controller=new AbortController();pending.current=controller;setBusy(true);setError('');setMessage('');
  try {
   const data=await api<Export>('/audit/export',{method:'POST',csrf:session.csrf_token,signal:controller.signal,body:{filters,reason:reason.trim()}});
   if(pending.current!==controller)return;
   if(typeof data.csv!=='string'||data.csv.length>2000000||!data.csv.startsWith('\ufeff')||!/^gilo-audit-summary-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.csv$/.test(data.filename)||!Number.isFinite(Date.parse(data.generated_at)))throw Error('The export response was incomplete. Please try again.');
   const url=URL.createObjectURL(new Blob([data.csv],{type:'text/csv;charset=utf-8;'}));
   const link=document.createElement('a');
   try {link.href=url;link.download=data.filename;document.body.appendChild(link);link.click();}
   finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
   setMessage(`Download requested. This fresh report was generated at ${new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST; its records may differ from the displayed snapshot.`);
  } catch(e){if(pending.current===controller)setError(e instanceof Error?e.message:'Export unavailable. Please try again.');}
  finally {if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <section className={embedded ? "space-y-4" : "space-y-3 rounded-lg border p-4"} aria-label="Audit summary export">{!embedded&&<h3 className="font-semibold">Export audit summary</h3>}<p className="text-sm">Exports all matching events in the applied period {filters.from&&filters.to?`(${filters.from} through ${filters.to}, IST)`:'(select a date range on the audit page)'} using the applied filters and a fresh, audited snapshot, regardless of the visible page. Includes event/action IDs, staff actor and subject IDs, and UTC/IST timestamps. Detailed metadata, reasons and IP addresses stay in the protected viewer. Maximum 31 days and 1,000 events; narrow the filters if the result is larger.</p>{(!filters.from||!filters.to)&&<p className="text-sm text-amber-800">Apply both date filters on the audit page before exporting.</p>}<label className="block">Audit export reason<Input className="mt-1 block w-full rounded border p-2" maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<Button disabled={busy||reason.trim().length<10||!filters.from||!filters.to} onClick={()=>void download()}>{busy?'Preparing audit export…':'Download audit CSV'}</Button></section>;
}
