import {TrackingMilestones} from './TrackingMilestones';
import {OperationalMap,type RouteSnapshot,type TrackingStop} from './OperationalMap';
import {useEffect,useMemo,useState} from 'react';
import {api} from './api';
import {useAuth} from './useAuth';
import {Button} from '@/components/ui/button';
import {TrackingStreetMap} from './TrackingStreetMap';
import {playbackPoints} from './trackingPlayback';
import type {RecordedSample} from './trackingPlayback';
type Snapshot={trip:{reference:string|null;status:string};gps:{state:string;recorded_at:string|null};items:RecordedSample[];route?:RouteSnapshot;stops?:{items:TrackingStop[];truncated:boolean}};
export function TrackingLive({id,onClose,autoStart=false,immersive=false,vehicle,startedAt}:{id:string;onClose:()=>void;autoStart?:boolean;immersive?:boolean;vehicle?:string;startedAt?:string}){
 const {session}=useAuth();
 const allowed=!!session?.staff.permissions.includes('tracking.evidence.read')&&!!session?.staff.permissions.includes('tracking.live.read');
 const [watch,setWatch]=useState(autoStart?'active':''),[data,setData]=useState<Snapshot|null>(null),[message,setMessage]=useState(''),[now,setNow]=useState(()=>Date.now());
 const csrf=session?.csrf_token;
 useEffect(()=>{
  if(!allowed||!watch)return;
  let disposed=false,controller:AbortController|null=null,timer:ReturnType<typeof setTimeout>|undefined;
  const clear=()=>{clearTimeout(timer);controller?.abort();controller=null;};
  async function refresh(){
   if(disposed||document.hidden||controller)return;
   const request=new AbortController();controller=request;
   const timeout=setTimeout(()=>request.abort(),15000);
   try{
    const value=await api<Snapshot>(`/tracking/${encodeURIComponent(id)}/live`,{signal:request.signal});
    if(disposed||controller!==request)return;
    if(!['STARTED','PICKING UP','ON THE WAY','RETURNING'].includes(value.trip.status)){setData(null);setMessage('Live viewing stopped: this trip is no longer active.');setWatch('');return;}
    setData(value);setNow(Date.now());setMessage('');
    timer=setTimeout(()=>void refresh(),2000);
   }catch(error){
    if(!disposed&&controller===request){
     setData(null);
     const status=(error as {status?:number})?.status;
     if(status===401||status===403||status===404){setMessage('Live viewing stopped: access is no longer available.');setWatch('');}
     else {setMessage('Connection interrupted. Reconnecting to live tracking…');timer=setTimeout(()=>void refresh(),5000);}
    }
   }finally{clearTimeout(timeout);if(controller===request)controller=null;}
  }
  const visibility=()=>{clear();setData(null);if(document.hidden)setMessage('Live viewing paused while this tab is hidden.');else void refresh();};
  document.addEventListener('visibilitychange',visibility);void refresh();
  const age=setInterval(()=>setNow(Date.now()),1000);
  return ()=>{disposed=true;clear();clearInterval(age);document.removeEventListener('visibilitychange',visibility);};
 },[allowed,watch,id,csrf]);
 const newest=data?.items[0];
 const points=useMemo(()=>playbackPoints(newest?[newest]:[]),[newest]);
 const age=points.length?(now-points[0].timestamp)/1000:Infinity;
 const recent=data?.gps.state==='recent'&&age>=0&&age<=60;
 if(!allowed)return <p role="status">Your role does not include live tracking access.</p>;
 if(immersive){
 const value=(n:number|null|undefined,unit:string)=>typeof n==='number'&&Number.isFinite(n)?`${n.toFixed(unit==='km'?1:0)} ${unit}`:'Unavailable';
 return <section className="flex h-full min-h-0 flex-col" aria-label="Live trip location">
 <div className="grid grid-cols-2 gap-px sm:grid-cols-4 border-b bg-border">{[['Route distance',value(data?.route?.total_km,'km')],['Distance left',value(recent?data?.route?.remaining_km:null,'km')],['Est. time left',value(recent?data?.route?.remaining_minutes:null,'min')],['Trip elapsed',value(startedAt&&Number.isFinite(Date.parse(startedAt))&&Date.parse(startedAt)<=now?(now-Date.parse(startedAt))/60000:null,'min')]].map(([label,text])=><div key={label} className="bg-white px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{text}</p></div>)}</div>
 <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white px-4 py-2 text-xs"><span>{message||(!data?'Loading tracking…':recent?'GPS updated · '+new Date(data.gps.recorded_at!).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'GPS stale or unavailable · vehicle marker hidden')}</span><span className="text-muted-foreground">Live location · refreshes every 2s · ETA excludes traffic/stops</span>{!watch&&<Button size="sm" onClick={()=>setWatch('active')}>Retry tracking</Button>}</div>
 {data?.stops?.truncated&&<p role="status" className="bg-white px-4 py-2 text-xs">Showing stops for the first 100 booked rides.</p>}<div className="min-h-0 flex-1">{data?<OperationalMap stops={data.stops?.items} route={data.route} position={recent?newest:undefined} vehicle={vehicle}/>:<div role="status" className="p-8 text-muted-foreground">{message||'Loading route and latest position…'}</div>}</div>
 {data&&<TrackingMilestones stops={data.stops?.items||[]} route={data.route} startedAt={startedAt} progress={recent?data.route?.progress_percent:null}/>}
 </section>;
 }
 return <section className="space-y-3 rounded-xl border bg-white p-5" aria-label="Live trip location">
 <div className="flex justify-between"><h2 className="font-semibold">Live trip location</h2><Button variant="ghost" onClick={onClose}>Close live view</Button></div>
 <p className="text-sm">Each location refresh is permission-checked and audited. Updates pause in hidden tabs. Stale or unavailable GPS cannot establish a no-show or trip completion.</p>
 {!watch&&<Button onClick={()=>{setMessage('');setWatch('active');}}>Start live view</Button>}
 {watch&&<Button variant="outline" onClick={()=>{setWatch('');setData(null);setMessage('Live viewing stopped.');}}>Stop live view</Button>}
 {message&&<p role="status">{message}</p>}
 {watch&&!data&&!message&&<p role="status">Loading latest reported location…</p>}
 {data&&<><p>{data.trip.reference||'Trip'} · {data.trip.status}</p><p>Latest GPS: {data.gps.recorded_at?new Date(data.gps.recorded_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Unavailable'}</p>
 {recent&&points.length?<><p className="text-sm">Reported coordinates: {points[0].latitude}, {points[0].longitude}</p><TrackingStreetMap points={points} index={0} live/></>:<p role="status">No recent valid location. Waiting for a fresh GPS report; no current-position marker is shown.</p>}</>}
 </section>;
}
