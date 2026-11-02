import {AdminTable} from '@/components/ui/admin-table';
import {Badge} from '@/components/ui/badge';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {RefreshCw,MoreHorizontal,ChevronLeft,ChevronRight,Info,Inbox as InboxIcon,ArrowUpRight,X,Activity} from 'lucide-react';
import {Textarea} from '@/components/ui/textarea';
import {NativeSelect} from '@/components/ui/native-select';
import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {api,ApiError} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
type Item={id:string;request_id:string;amount:string;status:string;accounting_state:string;version:number;signals:string[];case:{owner_id:string;status:string;version:number}|null};
type List={items:Item[];page:number;has_more:boolean;generated_at:string};
type Detail={item:Item;history:{id:string;actor_id:string;action:string;reason:string;created_at:string}[];history_truncated:boolean};
type Command=Record<string,unknown>;
const labels:Record<string,string>={investigation_required:'Conflicting evidence',repeated_check_failures:'Repeated provider check failures',expired_worker_lease:'Interrupted worker',overdue_check:'Check overdue by 5 minutes',unconfirmed_30_minutes:'Unconfirmed for 30 minutes',missing_check_schedule:'Missing recovery schedule'};
export function PayoutRecovery(){const {session}=useAuth();return session?.staff.permissions.includes('payouts.withdrawals.manage')?<Inbox/>:<p>You do not have access to payout recovery.</p>}
function Inbox(){
 const {session}=useAuth(),[list,setList]=useState<List|null>(null),[page,setPage]=useState(1),[filter,setFilter]=useState('attention'),[refresh,setRefresh]=useState(0),[selected,setSelected]=useState<Item|null>(null),[detail,setDetail]=useState<Detail|null>(null),[reason,setReason]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState<Command|null>(null);
 const inFlight=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{const c=new AbortController();api<List>('/payout-recovery',{method:'POST',csrf:session?.csrf_token,body:{action:'list',page,filter},signal:c.signal}).then(r=>{if(!c.signal.aborted)setList(r)}).catch(e=>{if(!c.signal.aborted)setError(e instanceof Error?e.message:'Unable to load recovery inbox')});return()=>c.abort()},[page,filter,refresh,session?.csrf_token]);
 useEffect(()=>{const id=setInterval(()=>{if(document.visibilityState==='visible'&&!inFlight.current&&!uncertain)setRefresh(v=>v+1)},30000);return()=>clearInterval(id)},[uncertain]);
 async function send(command:Command){
  if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setNotice('');
  try{const r=await api<Detail>('/payout-recovery',{method:'POST',csrf:session?.csrf_token,body:command});if(!mounted.current)return;
   setUncertain(null);
   if(command.action==='inspect'){setDetail(r);setSelected(r.item)}
   else{setDetail(null);setSelected(null);setReason('');setNotice('Recovery case updated. No wallet balance or payout outcome was changed.');setRefresh(v=>v+1)}
  }catch(e){if(mounted.current){setError(e instanceof Error?e.message:'Recovery action failed');if(command.action!=='inspect'&&(!(e instanceof ApiError)||e.status>=500))setUncertain(command);else{setUncertain(null);setDetail(null)}}}
  finally{inFlight.current=false;if(mounted.current)setBusy(false)}
 }
 const disabled=busy||Boolean(uncertain),valid=reason.trim().length>=10;
 function change(action:string){if(!detail)return;void send({action,id:detail.item.id,version:detail.item.case?.version||0,payout_version:detail.item.version,reason:reason.trim(),operation_id:crypto.randomUUID()})}
 return <section className="space-y-5">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Payout recovery inbox</h1><p className="mt-1 text-sm text-muted-foreground">Review delayed checks, uncertain transfers and recovery cases.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" render={<Link to="/withdrawal-payouts"/>}>Payout status checks<ArrowUpRight size={16}/></Button><Button variant="outline" disabled={disabled} onClick={()=>{setError('');setRefresh(v=>v+1)}}><RefreshCw size={16}/>Refresh inbox</Button></div></header>
  {error&&<p role="alert" className="rounded border bg-red-50 p-3">{error}</p>}{notice&&<p role="status" className="rounded border bg-emerald-50 p-3">{notice}</p>}
  {uncertain&&<div className="rounded border bg-amber-50 p-3"><p>The result is uncertain. Retry the same operation before making another change.</p><Button disabled={busy} onClick={()=>send(uncertain)}>Retry same operation</Button></div>}
  {selected&&<article className="space-y-3 rounded-xl border bg-white p-5">
   <h2 className="font-semibold">Review recovery case</h2><p className="font-mono text-xs">{selected.id}</p>
   <label className="block text-sm">Investigation reason or note<Textarea aria-label="Investigation reason or note" maxLength={500} disabled={disabled} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 block w-full rounded border p-2"/></label>
   {!detail?<Button disabled={disabled||!valid} onClick={()=>send({action:'inspect',id:selected.id,reason:reason.trim()})}>Inspect current evidence</Button>:<>
    <p>Status: {detail.item.status} · Wallet accounting: {detail.item.accounting_state}</p>
    <div className="flex flex-wrap gap-2"><Button disabled={disabled||!valid} onClick={()=>change('claim')}>Take ownership</Button>
     {detail.item.case&&detail.item.case.status!=='resolved'&&<><Button variant="outline" disabled={disabled||!valid} onClick={()=>change('note')}>Save note</Button><Button variant="outline" disabled={disabled||!valid} onClick={()=>change('escalate')}>Escalate case</Button>
     {detail.item.case.owner_id===session?.staff.id&&<Button variant="outline" disabled={disabled||!valid||detail.item.signals.length>0} onClick={()=>change('resolve')}>Close after verification</Button>}</>}
    </div><h3 className="font-semibold">Recent investigation history</h3>
    {!detail.history.length?<p>No investigation changes recorded.</p>:detail.history.map(h=><div key={h.id} className="border-t py-2 text-sm"><p>{h.action} · {new Date(h.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST</p><p>{h.reason}</p><p className="font-mono text-xs">Owner: {h.actor_id}</p></div>)}
    {detail.history_truncated&&<p className="text-xs">Showing the latest 20 changes. Older records remain in the audit history.</p>}
   </>}
   <Button variant="outline" disabled={disabled} onClick={()=>{setSelected(null);setDetail(null);setReason('')}}>Close review</Button>
  </article>}
  <div className="overflow-hidden rounded-xl border bg-background">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div className="flex items-center gap-2"><label htmlFor="recovery-queue" className="text-sm font-medium">Queue</label><div className="w-64 max-w-full"><NativeSelect id="recovery-queue" aria-label="Recovery filter" disabled={disabled} value={filter} onChange={e=>{setFilter(e.target.value);setPage(1);setList(null);setError('')}}><option value="attention">Needs attention or open case</option><option value="all">All recorded payouts</option></NativeSelect></div>{filter!=='attention'&&<Button size="icon" variant="ghost" aria-label="Reset queue filter" title="Reset queue filter" disabled={disabled} onClick={()=>{setFilter('attention');setPage(1);setList(null);setError('')}}><X size={16}/></Button>}</div><span className="flex items-center gap-2 text-xs text-muted-foreground"><Activity size={14}/>Auto-refresh · 30 seconds</span></div>
  {!list?<p role="status" className="p-8 text-sm text-muted-foreground">{error?'Inbox unavailable. Refresh to retry.':'Loading recovery inbox…'}</p>:<>
   {!list.items.length?<div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center"><span className="rounded-full bg-muted p-5"><InboxIcon className="size-6 text-muted-foreground"/></span><h2 className="font-semibold">No payouts match this queue.</h2><p className="max-w-md text-sm text-muted-foreground">Recovery cases appear here when transfers need review. Choose another queue to view other recorded payouts.</p></div>:<AdminTable><thead><tr><th>Payout</th><th>Amount</th><th>Recorded status</th><th>Recovery signals</th><th>Case / owner</th><th>Actions</th></tr></thead><tbody>{list.items.map(row=><tr key={row.id}>
    <td><p className="break-all font-mono text-xs">{row.id}</p><p className="mt-1 break-all text-xs text-muted-foreground">Withdrawal: {row.request_id}</p></td>
    <td className="whitespace-nowrap font-medium">{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(row.amount))}</td>
    <td><Badge variant="outline">{row.status.replaceAll('_',' ')}</Badge><p className="mt-1 text-xs text-muted-foreground">Accounting: {row.accounting_state.replaceAll('_',' ')}</p></td>
    <td>{row.signals.length?<div className="space-y-1">{row.signals.map(signal=><p key={signal} className="max-w-xs whitespace-normal text-sm text-amber-700">{labels[signal]||'Review required'}</p>)}</div>:<span className="text-sm text-muted-foreground">No recovery signals</span>}</td>
    <td><Badge variant="outline" className={row.case?.status==='resolved'?'border-emerald-200 bg-emerald-50 text-emerald-700':row.case?.status==='escalated'?'border-amber-200 bg-amber-50 text-amber-700':''}>{row.case?.status||'Unassigned'}</Badge>{row.case&&<p className="mt-1 break-all font-mono text-xs text-muted-foreground">Owner: {row.case.owner_id}</p>}</td>
    <td><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" disabled={disabled} aria-label={`Actions for payout ${row.id}`} title="Payout actions"/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>{setSelected(row);setDetail(null);setReason('');setError('')}}>Review case</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
   </tr>)}</tbody></AdminTable>}
   <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4"><span className="text-xs text-muted-foreground">{list.items.length} payouts on this page{list.generated_at&&` · Updated ${new Date(list.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST`}</span><div className="flex items-center gap-3"><Button variant="outline" disabled={disabled||page===1} onClick={()=>{setPage(p=>p-1);setList(null)}}><ChevronLeft size={16}/>Previous</Button><span className="text-sm">Page {page}</span><Button variant="outline" disabled={disabled||!list.has_more||page>=10000} onClick={()=>{setPage(p=>p+1);setList(null)}}>Next<ChevronRight size={16}/></Button></div></footer>
  </>}
  </div>
  <details className="rounded-xl border px-5 py-4 text-sm"><summary className="cursor-pointer font-medium"><Info className="mr-2 inline size-4"/>About payout recovery</summary><p className="mt-3 leading-relaxed text-muted-foreground">Investigate delayed checks and uncertain transfers. Taking ownership or escalating a case does not resend a payout or release funds. Closure requires a recent verified outcome and no outstanding recovery signals.</p></details>
 </section>;
}
