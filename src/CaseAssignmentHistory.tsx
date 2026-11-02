import { useState } from "react";
import { useRead } from "./useRead";
import { useAuth } from "./useAuth";
import { Button } from "@/components/ui/button";
type History = {items:{id:string;action:string;performed_by_you:boolean;reason:string|null;version:number|null;created_at:string|null}[];page:number;page_size:number;total:number};
export function CaseAssignmentHistory({id}:{id:string}) {
  const {session}=useAuth();
  const [open,setOpen]=useState(false);
  if(!session?.staff.permissions.includes("cases.assignment-history.read"))return null;
  return <div className="space-y-3 border-t pt-4">
    <Button variant="outline" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?"Hide assignment history":"View assignment history"}</Button>
    {open&&<HistoryList id={id}/>}
  </div>;
}
function HistoryList({id}:{id:string}) {
  const [page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const result=useRead<History>(`/ride-cases/${encodeURIComponent(id)}/assignment/history?page=${page}`,revision);
  const data=result?.data;
  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Assignment history</h3><Button variant="outline" onClick={()=>{setPage(1);setRevision(v=>v+1);}}>Refresh history</Button></div>
    <p className="text-sm text-slate-600">Recorded assignment changes · Times in IST</p>
    {!result&&<p role="status">Loading assignment history…</p>}
    {result?.error&&<p role="alert" className="text-red-800">{result.error}</p>}
    {data&&<>
      {data.items.length?<ol className="space-y-3">{data.items.map(item=><li key={item.id} className="rounded-lg border p-3">
        <p className="font-medium">{item.action}</p>
        <p className="text-sm text-slate-600">{item.performed_by_you?"By you":"By another staff member"} · {item.created_at&&Number.isFinite(Date.parse(item.created_at))?new Date(item.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",dateStyle:"medium",timeStyle:"short"}):"Time not recorded"}{item.version!==null?` · Version ${item.version}`:""}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.reason||"Reason not recorded"}</p>
      </li>)}</ol>:<p>No recorded assignment changes.</p>}
      <div className="flex items-center gap-3"><Button variant="outline" disabled={data.page<=1} onClick={()=>setPage(v=>v-1)}>Previous history</Button><span className="text-sm">Page {data.page} · {data.total} changes</span><Button variant="outline" disabled={data.page*data.page_size>=data.total} onClick={()=>setPage(v=>v+1)}>Next history</Button></div>
    </>}
  </div>;
}
