import {useState} from 'react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {Button} from '@/components/ui/button';
type Result={items:{id:string;decision:string;reason:string|null;reviewer_id:string;created_at:string|null;expires_on:string|null}[];total:number;page:number;page_size:number};
export function VerificationHistory({kind,id}:{kind:string;id:string}){const {session}=useAuth();return session?.staff.permissions.includes('verification.read')?<History key={kind+id} kind={kind} id={id}/>:null;}
function History({kind,id}:{kind:string;id:string}){
 const [page,setPage]=useState(1),[version,setVersion]=useState(0);
 const result=useRead<Result>(`/verification/${encodeURIComponent(kind)}/${encodeURIComponent(id)}/history?page=${page}`,version),data=result?.data;
 return <section className="space-y-4"><div className="flex justify-between gap-4"><h3 className="font-semibold">Manual review history</h3><Button variant="outline" disabled={!result} onClick={()=>setVersion(v=>v+1)}>Refresh history</Button></div>
 <p className="text-sm text-slate-500">Historical decisions apply to the evidence reviewed at that time. They do not prove current approval or replace provider verification.</p>
 {!result&&<p role="status">Loading review history…</p>}{result?.error&&<p role="alert">{result.error}</p>}
 {data&&<>{data.items.length===0?<p>No manual decisions recorded.</p>:<ol className="space-y-3">{data.items.map(row=><li key={row.id} className="space-y-2 rounded-lg border p-4"><p className="font-medium capitalize">{row.decision.replaceAll('_',' ')}</p><p className="whitespace-pre-wrap break-words text-sm">{row.reason||'Reason unavailable'}</p><p className="break-all text-xs text-slate-500">Staff {row.reviewer_id} · {row.created_at&&Number.isFinite(Date.parse(row.created_at))?new Date(row.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Time unavailable'} (IST)</p>{row.expires_on&&<p className="text-xs">Document expiry: {row.expires_on}</p>}</li>)}</ol>}
 <div className="flex items-center gap-3"><Button variant="outline" disabled={data.page<=1} onClick={()=>setPage(page-1)}>Previous decisions</Button><span>Page {data.page}</span><Button variant="outline" disabled={data.page*data.page_size>=data.total} onClick={()=>setPage(page+1)}>Next decisions</Button></div></>}
 </section>;
}
