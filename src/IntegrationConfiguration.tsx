import {useState} from 'react';
import {Link} from 'react-router-dom';
import {RefreshCw, Settings2, Server, Plug, ListChecks, CircleAlert, Info, ArrowUpRight} from 'lucide-react';
import {useAuth} from './useAuth';
import {useRead} from './useRead';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger} from '@/components/ui/dialog';
type Result={generated_at:string;runtime:string;items:{id:string;label:string;mode?:string;note:string;checks:{id:string;label:string;status:string}[]}[]};
const labels:Record<string,string>={present:'Present · not verified',missing:'Missing',valid_format:'Format valid · not verified',invalid:'Invalid',enabled:'Enabled',disabled:'Disabled',development_default:'Development default',sandbox_default:'Sandbox default'};
export function IntegrationConfiguration(){const {session}=useAuth();return session?.staff.permissions.includes('health.read')?<Configuration/>:<p>You do not have access to integration configuration.</p>;}
function Configuration(){
 const [version,setVersion]=useState(0),result=useRead<Result>('/integration-configuration',version),data=result?.data;
 const checks=data?.items.flatMap(item=>item.checks)||[];
 const issues=checks.filter(check=>['missing','invalid'].includes(check.status)).length;
 const checked=data&&Number.isFinite(Date.parse(data.generated_at))?new Date(data.generated_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})+' IST':'Time unavailable';
 return <section className="space-y-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div><h1 className="text-3xl font-semibold">Integration configuration</h1><p className="mt-2 text-sm text-muted-foreground">Server settings and integration checks · Read-only</p></div>
   <div className="flex flex-wrap gap-2"><Dialog><DialogTrigger render={<Button variant="outline"/>}><Settings2 size={16}/>Configuration guide</DialogTrigger><DialogContent><DialogTitle className="pr-8 text-xl font-semibold">Changing server settings</DialogTitle><DialogDescription className="mt-2 text-sm text-muted-foreground">Manage settings through your deployment’s protected configuration.</DialogDescription><div className="mt-5 space-y-4 text-sm leading-relaxed"><p>Review changes and restart affected services where required, then refresh this page and test the actual workflow.</p><p>A load-balanced deployment may have differently configured instances; this page is not a fleet-wide inventory.</p><p>This view does not inspect device configuration, push credentials, backup status or every integration. It does not send OTPs, call providers, rotate keys or change settings.</p></div></DialogContent></Dialog>
   <Button variant="outline" onClick={()=>setVersion(v=>v+1)}><RefreshCw size={16}/>Refresh configuration</Button></div>
  </div>
  <div className="flex items-start gap-3 rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground"><Info size={17} className="mt-0.5 shrink-0"/><p>Configuration presence is not a successful connection test or launch approval. Secret values, identifiers and domains are never displayed.</p></div>
  {!result?<div role="status" className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">Loading configuration…</div>:result.error?<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{result.error}</p>:data&&<>
   <div className="grid gap-4 sm:grid-cols-3">
    {[{label:'Integrations',value:data.items.length,icon:Plug},{label:'Recorded checks',value:checks.length,icon:ListChecks},{label:'Missing or invalid',value:issues,icon:CircleAlert}].map(({label,value,icon:Icon})=><div key={label} className="rounded-2xl border bg-card"><div className="flex items-center justify-between border-b bg-muted/20 px-5 py-3 text-sm font-medium">{label}<Icon size={17} className="text-muted-foreground"/></div><div className="px-5 py-4 text-3xl font-semibold tabular-nums">{value}</div></div>)}
   </div>
   <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Server size={14}/>Runtime <Badge variant="secondary" className="capitalize">{data.runtime||'Unavailable'}</Badge></span><span>Checked {checked} · Serving backend instance</span></div>
   {!data.items.length?<div className="rounded-2xl border p-10 text-center"><Plug className="mx-auto mb-3 text-muted-foreground" size={28}/><h2 className="font-semibold">No integration records available</h2><p className="mt-2 text-sm text-muted-foreground">Refresh to check for recorded configuration.</p></div>:<div className="grid items-start gap-5 xl:grid-cols-2">{data.items.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border bg-card">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4"><h2 className="flex items-center gap-2 font-semibold"><Plug size={17} className="text-muted-foreground"/>{item.label}</h2>{item.mode&&<Badge variant="outline">{item.mode==='SANDBOX'?'Sandbox · test':item.mode==='PRODUCTION'?'Production · live':'Invalid environment'}</Badge>}</div>
    <dl className="divide-y">{item.checks.map(check=><div key={check.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm"><dt>{check.label}</dt><dd><Badge variant="outline" className={['missing','invalid'].includes(check.status)?'border-amber-200 bg-amber-50 text-amber-800':'bg-muted/30 text-muted-foreground'}>{labels[check.status]||'Unavailable'}</Badge></dd></div>)}</dl>
    <p className="border-t bg-muted/10 px-5 py-4 text-xs leading-relaxed text-muted-foreground">{item.note}</p>
   </article>)}</div>}
  </>}
  <div className="rounded-2xl border bg-card p-5"><h2 className="text-sm font-semibold">Related monitoring</h2><div className="mt-3 flex flex-wrap gap-2">{[['/map-health','Map request evidence'],['/payment-webhook-health','Payment webhook evidence'],['/system','System health']].map(([to,label])=><Button key={to} variant="outline" render={<Link to={to}/>}>{label}<ArrowUpRight size={14}/></Button>)}</div></div>
 </section>;
}
