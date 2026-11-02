import {AdminTable} from '@/components/ui/admin-table';
import {Badge} from '@/components/ui/badge';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Landmark,Plus,RefreshCw,MoreHorizontal,ChevronLeft,ChevronRight,Info} from 'lucide-react';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {useEffect, useRef, useState} from 'react';
import {api, ApiError} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Item = {id:string;beneficiary_id:string;name:string;account_last4:string;ifsc:string;status:string;proposer_id:string;reason:string;review_reason:string|null;version:number;updated_at:string};
type List = {items:Item[];page:number;has_more:boolean};
type Preview = {preview_id:string;id:string|null;snapshot:{name:string;account_last4:string;ifsc:string;beneficiary_id:string};expires_at:string};
type Command = Record<string,unknown>;
export function SandboxPayoutBeneficiaries(){
 const {session}=useAuth();
 return session?.staff.permissions.includes('payouts.sandbox.manage')?<Registry/>:<p>You do not have access to sandbox payout beneficiaries.</p>;
}
function Registry(){
 const {session}=useAuth();
 const [data,setData]=useState<List|null>(null),[page,setPage]=useState(1),[version,setVersion]=useState(0);
 const [beneficiaryId,setBeneficiaryId]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [selected,setSelected]=useState<Item|null>(null),[preview,setPreview]=useState<Preview|null>(null),[decision,setDecision]=useState<'decline'|'revoke'|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[uncertain,setUncertain]=useState<Command|null>(null);
 const [creating,setCreating]=useState(false);
 const inflight=useRef(false), mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{const controller=new AbortController();api<List>('/sandbox-payout-beneficiaries',{method:'POST',csrf:session?.csrf_token,body:{action:'list',page},signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setData(result)}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load reviews')});return()=>controller.abort()},[page,version,session?.csrf_token]);
 function reset(){setCreating(false);setSelected(null);setPreview(null);setDecision(null);setReason('');setConfirmed(false);setBeneficiaryId('');}
 async function send(body:Command){
  if(inflight.current)return;inflight.current=true;setBusy(true);setError('');setNotice('');
  const mutation=body.action!=='preview';
  try{
   const result=await api<Preview>('/sandbox-payout-beneficiaries',{method:'POST',csrf:session?.csrf_token,body});
   if(!mounted.current)return;
   if(mutation){setUncertain(null);reset();setData(null);setVersion(v=>v+1);setNotice('Sandbox beneficiary review saved. No transfer was made.');}else setPreview(result);
  }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Review failed');if(mutation&&(!(e instanceof ApiError)||e.status>=500))setUncertain(body);else{setUncertain(null);setPreview(null)}}}
  finally{inflight.current=false;if(mounted.current)setBusy(false)}
 }
 const disabled=busy||Boolean(uncertain),validReason=reason.trim().length>=10;
 function choose(row:Item,action:'approve'|'decline'|'revoke'){reset();setSelected(row);setDecision(action==='approve'?null:action);setError('');setNotice('')}
 return <section className="space-y-5">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h1 className="text-2xl font-semibold tracking-tight">Sandbox payout beneficiaries</h1><p className="mt-1 text-sm text-muted-foreground">Test environment only · Approval does not authorize withdrawals or send money.</p></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={disabled} onClick={()=>{reset();setData(null);setError('');setVersion(v=>v+1)}}><RefreshCw size={16}/>Refresh reviews</Button><Button disabled={disabled} onClick={()=>{reset();setCreating(true);setError('');setNotice('')}}><Plus size={16}/>Add test beneficiary</Button></div>
  </header>
  {notice&&<p role="status" className="rounded border bg-emerald-50 p-3">{notice}</p>}{error&&<p role="alert" className="rounded border bg-red-50 p-3">{error}</p>}
  {uncertain&&<div className="space-y-2 rounded border bg-amber-50 p-3"><p>The result is uncertain. Retry this same operation before starting another review.</p><Button disabled={busy} onClick={()=>send(uncertain)}>Retry same operation</Button></div>}
  {(creating||selected)&&<article className="space-y-4 rounded-xl border bg-white p-5">
   <h2 className="font-semibold">{decision==='revoke'?'Revoke sandbox approval':decision==='decline'?'Decline sandbox review':selected?'Independently review beneficiary':'Add a test beneficiary for review'}</h2>
   {selected?<p className="text-sm">{selected.name} · {selected.beneficiary_id} · account ending {selected.account_last4}</p>:<label className="block text-sm">Sandbox beneficiary ID<Input aria-label="Sandbox beneficiary ID" value={beneficiaryId} disabled={disabled||Boolean(preview)} maxLength={50} onChange={e=>setBeneficiaryId(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>}
   <label className="block text-sm">Review reason<Textarea aria-label="Review reason" value={reason} disabled={disabled||Boolean(preview)} maxLength={500} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>
   {!decision&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={disabled||Boolean(preview)} onChange={e=>setConfirmed(e.target.checked)}/>I am reviewing test data in the sandbox, not a real customer bank account.</label>}
   {preview?<div className="space-y-3 rounded border bg-emerald-50 p-4"><p className="font-semibold">{preview.snapshot.name}</p><p>Account ending {preview.snapshot.account_last4} · IFSC {preview.snapshot.ifsc}</p><p className="text-sm">Provider status: verified in sandbox. Preview expires {new Date(preview.expires_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. Details are checked again when you confirm.</p><Button disabled={disabled} onClick={()=>send({action:selected?'approve':'propose',preview_id:preview.preview_id,operation_id:crypto.randomUUID(),...(selected?{id:selected.id}:{})})}>{selected?'Approve for sandbox review':'Submit for independent review'}</Button></div>:decision&&selected?<Button disabled={disabled||!validReason} variant="destructive" onClick={()=>send({action:decision,id:selected.id,version:selected.version,reason:reason.trim(),operation_id:crypto.randomUUID()})}>{decision==='revoke'?'Confirm revocation':'Confirm decline'}</Button>:<Button disabled={disabled||!validReason||!confirmed||(!selected&&!beneficiaryId.trim())} onClick={()=>send({action:'preview',reason:reason.trim(),test_data_confirmed:true,...(selected?{id:selected.id}:{beneficiary_id:beneficiaryId.trim()})})}>{busy?'Checking…':'Check and preview beneficiary'}</Button>}
   {<Button variant="outline" className="ml-2" disabled={disabled} onClick={reset}>Cancel review</Button>}
  </article>}
  <div className="overflow-hidden rounded-xl border bg-background">
  {!data?(error?<p>Reviews are unavailable. Refresh to try again.</p>:<p role="status">Loading reviews…</p>):<>
   {!data.items.length?<div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><span className="rounded-full bg-muted p-5"><Landmark className="size-6 text-muted-foreground"/></span><h2 className="font-semibold">No sandbox beneficiary reviews yet.</h2><p className="max-w-md text-sm text-muted-foreground">Add an existing sandbox beneficiary for independent review.</p></div>:<AdminTable><thead><tr><th>Test account</th><th>Beneficiary</th><th>Review status</th><th>Review notes</th><th>Updated (IST)</th><th>Actions</th></tr></thead><tbody>{data.items.map(row=><tr key={row.id}>
    <td><p className="font-medium">{row.name}</p><p className="text-sm text-muted-foreground">Ending {row.account_last4} · {row.ifsc}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">Review: {row.id}</p></td>
    <td><p className="font-medium">{row.beneficiary_id}</p></td>
    <td><Badge variant="outline" className={row.status==='approved'?'border-emerald-200 bg-emerald-50 text-emerald-700':row.status==='pending'?'border-amber-200 bg-amber-50 text-amber-700':'border-slate-200 bg-slate-50 text-slate-600'}>{row.status==='approved'?'Approved · sandbox only':row.status.charAt(0).toUpperCase()+row.status.slice(1)}</Badge>{row.status==='pending'&&row.proposer_id===session?.staff.id&&<p className="mt-2 max-w-48 text-xs text-muted-foreground">A different owner must approve your proposal.</p>}</td>
    <td><p className="max-w-xs whitespace-normal text-sm">{row.reason}</p>{row.review_reason&&<p className="mt-1 max-w-xs whitespace-normal text-sm text-muted-foreground">Decision: {row.review_reason}</p>}</td>
    <td className="text-sm text-muted-foreground">{new Date(row.updated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td>
    <td>{['pending','approved'].includes(row.status)?<DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={`Actions for ${row.beneficiary_id}`} title="Review actions"/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent>{row.status==='pending'&&<>{row.proposer_id!==session?.staff.id&&<DropdownMenuItem onClick={()=>choose(row,'approve')}>Review for approval</DropdownMenuItem>}<DropdownMenuItem onClick={()=>choose(row,'decline')}>Decline review</DropdownMenuItem></>}{row.status==='approved'&&<DropdownMenuItem onClick={()=>choose(row,'revoke')}>Revoke approval</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>:<span className="text-muted-foreground">—</span>}</td>
   </tr>)}</tbody></AdminTable>}
   <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><span className="text-sm text-muted-foreground">{data.items.length} reviews on this page</span><div className="flex items-center gap-3"><Button variant="outline" disabled={disabled||page===1} onClick={()=>{reset();setData(null);setError('');setPage(p=>p-1)}}><ChevronLeft size={16}/>Previous</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={disabled||!data.has_more||page>=10000} onClick={()=>{reset();setData(null);setError('');setPage(p=>p+1)}}>Next<ChevronRight size={16}/></Button></div></footer>
  </>}
  </div>
  <details className="rounded-xl border px-5 py-4 text-sm"><summary className="cursor-pointer font-medium"><Info className="mr-2 inline size-4"/>About sandbox beneficiary reviews</summary><p className="mt-3 leading-relaxed text-muted-foreground">Test environment only. Provider verification confirms a sandbox beneficiary record, not ownership of a Gilo customer's account. Approval here does not authorize a withdrawal or send money.</p></details>
 </section>;
}
