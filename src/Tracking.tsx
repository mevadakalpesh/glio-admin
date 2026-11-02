import {TripTrackingPage} from './TripTrackingPage';
import {FilterBuilder} from "@/components/ui/filter-builder";
import {useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Activity, ArrowUpRight, ChevronLeft, ChevronRight, Info, MapPin, MoreHorizontal, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {ColumnPicker} from '@/components/ui/column-picker';
import {DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {TrackingLive} from './TrackingLive';
import {TrackingInspection} from './TrackingInspection';
import {useAuth} from './useAuth';
import {useVisibleSnapshot} from './useVisibleSnapshot';
type Signal={state:string;age_seconds:number|null;recorded_at:string|null};
type Result={items:{id:string;reference:string|null;status:string;started_at:string|null;gps:Signal;heartbeat:Signal;tracking_reported:boolean|null}[];total:number;page:number;page_size:number;generated_at:string;freshness_seconds:number};
const time=(value:string|null)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'medium'}):'Not recorded';
const labels:Record<string,string>={recent:'Recent record',stale:'Stale record',missing:'Not recorded',invalid:'Invalid timestamp'};
const columns=[{key:'started',label:'Started'},{key:'gps',label:'GPS record'},{key:'heartbeat',label:'App heartbeat'},{key:'flag',label:'Tracking flag'}];
function SignalView({signal}:{signal:Signal}){
 const tone=signal.state==='recent'?'bg-emerald-50 text-emerald-800':signal.state==='stale'?'bg-amber-50 text-amber-800':'bg-muted text-muted-foreground';
 return <div className="space-y-1.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${tone}`}><span className="size-1.5 rounded-full bg-current"/>{labels[signal.state]||'Unavailable'}</span><p className="text-xs text-muted-foreground">{time(signal.recorded_at)}</p>{signal.age_seconds!==null&&<p className="text-xs text-muted-foreground">{signal.age_seconds} seconds old at snapshot</p>}</div>;
}
export function Tracking(){const {session}=useAuth();const [params]=useSearchParams();const id=params.get('id');if(id)return <TripTrackingPage id={id}/>;return session?.staff.permissions.includes('tracking.live.read')?<TrackingQueue/>:<p>You do not have access to live operations.</p>;}
function TrackingQueue(){
 const [live,setLive]=useState<string|null>(null);
 const [inspected,setInspected]=useState<string|null>(null);
 const [hidden,setHidden]=useState<string[]>([]);
 const {session}=useAuth();const permissions=session?.staff.permissions||[];
 const [params,setParams]=useSearchParams();const query=new URLSearchParams();for(const key of ['page','reference'])if(params.get(key))query.set(key,params.get(key)!);
 const {result,refresh}=useVisibleSnapshot<Result>(`/tracking?${query}`),data=result?.data;
 function page(value:number){const next=new URLSearchParams(params);next.set('page',String(value));setParams(next);}
 function clear(){setParams({});}
 const actions=permissions.some(p=>['journeys.read','cases.read','tracking.evidence.read'].includes(p));
 return <section className="space-y-6">
 <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Live operations</h1><p className="mt-1 text-sm text-muted-foreground">Monitor active trips and tracking updates.</p></div><Button variant="outline" disabled={!result} onClick={refresh}><RefreshCw size={16} className={!result?'animate-spin':''}/>Refresh tracking</Button></header>
 {live&&<TrackingLive key={live} id={live} onClose={()=>setLive(null)}/>}
 {inspected&&<TrackingInspection key={inspected} id={inspected} onClose={()=>setInspected(null)}/>}
 <Card className="gap-0 rounded-2xl py-0">
 <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4"><FilterBuilder fields={[{key:'reference',label:'Trip reference',value:params.get('reference')||'',maxLength:24,normalize:value=>value.trim().toUpperCase(),valid:value=>/^T0*[1-9][0-9]*$/.test(value)}]} onChange={values=>{setParams(previous=>{const next=new URLSearchParams(previous);next.delete('page');for(const [key,value] of Object.entries(values)){if(value)next.set(key,value);else next.delete(key);}return next;});}}/><ColumnPicker columns={columns} hidden={hidden} onChange={setHidden}/></div>
 <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-4 py-3 text-xs text-muted-foreground"><span>{data?`${data.total} matching active ${data.total===1?'trip':'trips'}`:'Active trips'}</span><span className="inline-flex items-center gap-2"><Activity size={14}/>Auto-refresh · 30 seconds</span></div>
 {!result&&<div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground" role="status"><RefreshCw size={16} className="animate-spin"/>Refreshing tracking evidence…</div>}
 {result?.error&&<div role="alert" className="p-6 text-sm text-destructive">{result.error}</div>}
 {data&&(data.items.length===0?<div className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center"><div className="mb-4 rounded-full bg-muted p-4"><MapPin className="text-muted-foreground" size={24}/></div><h2 className="text-base font-semibold">No active trips found</h2><p className="mt-2 text-sm text-muted-foreground">No active ride trips match these filters.</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">{params.get('reference')?'Try another trip reference or clear your search.':'Trips appear here once they are active. This view updates automatically.'}</p>{params.get('reference')&&<Button variant="outline" className="mt-5" onClick={clear}>Show all active trips</Button>}</div>:<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-muted-foreground"><th className="px-5 py-3 font-medium">Trip</th>{columns.filter(c=>!hidden.includes(c.key)).map(c=><th className="px-5 py-3 font-medium" key={c.key}>{c.label}</th>)}{actions&&<th className="w-12 px-5 py-3"><span className="sr-only">Actions</span></th>}</tr></thead><tbody>{data.items.map(row=><tr key={row.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-5 py-5 align-top"><p className="font-semibold">{row.reference||'Reference unavailable'}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{row.status.toLowerCase().replaceAll('_',' ')}</p></td>{!hidden.includes('started')&&<td className="px-5 py-5 align-top text-muted-foreground">{time(row.started_at)}</td>}{!hidden.includes('gps')&&<td className="px-5 py-5 align-top"><SignalView signal={row.gps}/></td>}{!hidden.includes('heartbeat')&&<td className="px-5 py-5 align-top"><SignalView signal={row.heartbeat}/></td>}{!hidden.includes('flag')&&<td className="px-5 py-5 align-top">{row.tracking_reported===true?'Reported active':row.tracking_reported===false?'Reported inactive':'Unavailable'}<p className="mt-1 text-xs text-muted-foreground">Stored flag only</p></td>}{actions&&<td className="px-4 py-5 align-top"><DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${row.reference||'trip'}`}/> }><MoreHorizontal size={18}/></DropdownMenuTrigger><DropdownMenuContent><p className="px-3 py-2 text-xs text-muted-foreground">Actions</p>{permissions.includes('journeys.read')&&<DropdownMenuItem render={<Link to={`/trips?kind=trips&id=${encodeURIComponent(row.id)}`}/>}>View trip<ArrowUpRight size={14}/></DropdownMenuItem>}{permissions.includes('cases.read')&&row.reference&&<DropdownMenuItem render={<Link to={`/support?trip_reference=${encodeURIComponent(row.reference)}`}/>}>Review trip cases</DropdownMenuItem>}{permissions.includes('tracking.evidence.read')&&<><DropdownMenuItem onClick={()=>{setLive(null);setInspected(row.id);}}>Inspect locations</DropdownMenuItem><DropdownMenuItem render={<Link to={`/tracking?id=${encodeURIComponent(row.id)}`}/>}>Open trip tracking</DropdownMenuItem></>}</DropdownMenuContent></DropdownMenu></td>}</tr>)}</tbody></table></div>)}
 {data&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"><p className="text-xs text-muted-foreground">Updated {time(data.generated_at)} IST</p><div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={data.page<=1} onClick={()=>page(data.page-1)}><ChevronLeft size={14}/>Previous</Button><span className="text-xs text-muted-foreground">Page {data.page}</span><Button variant="outline" size="sm" disabled={data.page*data.page_size>=data.total} onClick={()=>page(data.page+1)}>Next<ChevronRight size={14}/></Button></div></footer>}
 </Card>
 <details className="group text-sm text-muted-foreground"><summary className="flex cursor-pointer list-none items-center gap-2 font-medium"><Info size={15}/>About tracking data<ChevronRight size={14} className="transition-transform group-open:rotate-90"/></summary><div className="mt-3 max-w-4xl space-y-2 leading-relaxed"><p>A recent heartbeat is not proof of a recent location. Missing GPS does not establish a no-show, unsafe passenger exit or trip completion. Precise locations require an audited inspection or an explicit live view.</p>{data&&<p>Records up to {data.freshness_seconds} seconds old are labelled recent. Refreshes every 30 seconds while this tab is visible.</p>}</div></details>
 </section>;
}
