import {useState,type ReactNode} from 'react';
import {FileClock,MoreHorizontal,Plus,RefreshCw} from 'lucide-react';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {AdminTable} from '@/components/ui/admin-table';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu';
type RecordItem={id:string;version:number;state:string;effective_at:string;reason:string};
type FormControls={done:()=>void;onBusyChange:(busy:boolean)=>void};
export function PolicyWorkspace<T extends RecordItem>({title,guidance,current,items,page,hasMore,refresh,onPage,proposal,review,directOwner=false}:{directOwner?:boolean;title:string;guidance:string;current:ReactNode;items:T[];page:number;hasMore:boolean;refresh:()=>void;onPage:(page:number)=>void;proposal?: (controls:FormControls)=>ReactNode;review:(item:T,controls:FormControls)=>ReactNode}){
 const {session}=useAuth();
 const [selected,setSelected]=useState<T|'new'|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const done=()=>{setSelected(null);setBusy(false);setNotice('Policy action recorded.');refresh();};
 return <section className="space-y-6">
  <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{directOwner?'Current settings and recorded owner changes.':'Current rules and independently reviewed changes.'}</p></div><div className="flex flex-wrap gap-2">{proposal&&session?.staff.permissions.includes('policies.propose')&&<Button onClick={()=>setSelected('new')}><Plus size={16}/>{directOwner?'Change settings':'Propose change'}</Button>}<Button variant="outline" onClick={refresh}><RefreshCw size={16}/>Refresh</Button></div></header>
  {notice&&<p role="status" className="rounded-xl border bg-muted/30 p-3 text-sm">{notice}</p>}
  {current}
  <details className="rounded-xl border px-5 py-3 text-sm"><summary className="cursor-pointer font-medium">How policy changes apply</summary><p className="mt-3 leading-relaxed text-muted-foreground">{guidance}</p></details>
  <div className="overflow-hidden rounded-2xl border"><AdminTable toolbar={<h2 className="font-semibold">{directOwner?'Settings history':'Proposal and approval history'}</h2>}><thead><tr><th>Version</th><th>Status</th><th>Activation (IST)</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{items.map(item=><tr key={item.id}><td className="font-medium">Version {item.version}</td><td><Badge variant="outline" className="capitalize">{item.state}</Badge></td><td>{new Date(item.effective_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</td><td className="max-w-xs break-words">{item.reason}</td><td><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for version ${item.version}`}/>}><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem onClick={()=>setSelected(item)}>View policy</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td></tr>)}</tbody></AdminTable>
  {!items.length&&<div className="flex flex-col items-center gap-3 px-5 py-12 text-center"><span className="rounded-full bg-muted p-4"><FileClock className="text-muted-foreground"/></span><h3 className="font-semibold">No policy proposals yet</h3><p className="text-sm text-muted-foreground">Submitted changes and review decisions will appear here.</p></div>}
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-sm"><span className="text-muted-foreground">Page {page}</span><div className="flex gap-2"><Button variant="outline" disabled={page===1} onClick={()=>onPage(page-1)}>Previous</Button><Button variant="outline" disabled={!hasMore} onClick={()=>onPage(page+1)}>Next</Button></div></footer></div>
  <Dialog open={selected!==null} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}}><DialogContent className={directOwner?"flex max-w-3xl flex-col overflow-hidden p-0":"max-w-4xl"}><div className={directOwner?"shrink-0 border-b px-6 py-5":""}><DialogTitle className="pr-8 text-xl font-semibold">{selected==='new'?(directOwner?'Change settings':'Propose policy change'):'Policy details'}</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">{selected==='new'?(directOwner?'Review and save your changes as the owner.':'Preview the impact before submitting for independent approval.'):'Review the recorded values, activation time and decision history.'}</DialogDescription></div><div className={directOwner?"min-h-0 overflow-y-auto px-6 py-5":"mt-5"}>{selected==='new'?proposal?.({done,onBusyChange:setBusy}):selected?review(selected,{done,onBusyChange:setBusy}):null}</div></DialogContent></Dialog>
 </section>;
}
