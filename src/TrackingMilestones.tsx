import {Check,Flag,MapPin} from 'lucide-react';
import type {TrackingStop,RouteSnapshot} from './OperationalMap';
const stamp=(value?:string|null)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):null;
export function TrackingMilestones({stops,route,startedAt,progress}:{stops:TrackingStop[];route?:RouteSnapshot;startedAt?:string;progress?:number|null}){
 const coordinates=route?.coordinates||[];
 const position=(stop:TrackingStop)=>{
  let best=Infinity,position=Infinity;
  for(let i=0;i<coordinates.length-1;i++){
   const a=coordinates[i],b=coordinates[i+1],x=b[0]-a[0],y=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((stop.longitude-a[0])*x+(stop.latitude-a[1])*y)/(x*x+y*y||1)));
   const distance=(stop.longitude-a[0]-t*x)**2+(stop.latitude-a[1]-t*y)**2;
   if(distance<best){best=distance;position=i+t;}
  }
  return position;
 };
 const ordered=[...stops].sort((a,b)=>position(a)-position(b)||(a.ride_id===b.ride_id?(a.kind==='pickup'?-1:1):a.id.localeCompare(b.id)));
 const items=[{id:'start',label:'Trip start',address:'Journey departure',recorded_at:startedAt,scheduled_at:null,kind:'start'},...ordered,{id:'end',label:'Trip end',address:'Final destination',recorded_at:null,scheduled_at:null,kind:'end'}];
 return <section aria-label="Journey milestones" className="shrink-0 border-t bg-white px-4 py-3"><div className="mb-3 flex items-center justify-between text-xs"><span className="font-medium">Journey progress · IST</span><span className="text-muted-foreground">{progress!=null?`${Math.round(progress)}% of route · estimated`:'Route progress unavailable'}</span></div><ol className="flex overflow-x-auto pb-1">{items.map((item,index)=>{const actual=stamp(item.recorded_at),scheduled=stamp(item.scheduled_at);return <li key={item.id} className="min-w-[160px] flex-1"><div className="flex items-center"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 ${actual?'border-emerald-600 bg-emerald-600 text-white':item.kind==='pickup'?'border-emerald-500 text-emerald-600':item.kind==='drop'?'border-orange-500 text-orange-600':'border-slate-300 text-slate-500'}`}>{actual?<Check size={14}/>:item.kind==='pickup'||item.kind==='drop'?<MapPin size={14}/>:<Flag size={14}/>}</span>{index<items.length-1&&<span className={`h-0.5 flex-1 ${actual&&stamp(items[index+1].recorded_at)?'bg-emerald-500':'bg-slate-200'}`}/>}</div><p className="mt-2 pr-3 text-xs font-semibold">{item.label}</p><p title={item.address} className="mt-1 max-w-48 truncate pr-3 text-xs text-muted-foreground">{item.address}</p><p className="mt-1 pr-3 text-xs">{actual?`${actual} · Recorded`:scheduled?`${scheduled} · Scheduled`:'Pending · time not recorded'}</p></li>})}</ol></section>;
}
