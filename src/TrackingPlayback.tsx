import {Input} from '@/components/ui/input';
import {TrackingStreetMap} from "./TrackingStreetMap";
import {useEffect,useMemo,useState} from 'react';
import {Play,Pause,SkipBack,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {playbackPoints} from './trackingPlayback';
import type {RecordedSample} from './trackingPlayback';
const stamp=(value:string|null)=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'medium'})+' IST':'Unavailable';
export function TrackingPlayback({samples,scope="page"}:{samples:RecordedSample[];scope?:"page"|"window"}){
 const points=useMemo(()=>playbackPoints(samples),[samples]);
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false),[streetMap,setStreetMap]=useState(false);
 const current=points[Math.min(index,points.length-1)];
 useEffect(()=>{
  if(!playing)return;
  const advance=()=>{if(document.hidden){setPlaying(false);return;}setIndex(Math.min(index+1,points.length-1));if(index+1>=points.length-1)setPlaying(false);};
  const timer=setInterval(advance,1000);
  const visibility=()=>{if(document.hidden)setPlaying(false);};
  document.addEventListener('visibilitychange',visibility);
  return ()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
 },[playing,points.length,index]);
 if(!current)return <p className="rounded-lg bg-slate-50 p-4 text-sm">No valid coordinates and timestamps are available for playback in this {scope}.</p>;
 const segments:typeof points[]=[];
 points.slice(0,index+1).forEach(point=>{if(!segments.length||point.gap)segments.push([]);segments[segments.length-1].push(point);});
 const move=(value:number)=>{setPlaying(false);setIndex(value);};
 return <section className="space-y-3 rounded-xl border p-4" aria-label="Recorded location playback">
  <h3 className="font-semibold">Recorded location playback</h3>
  <p className="text-xs text-slate-600">Coordinate preview of this {scope==="window"?"complete time window":"loaded page"}, oldest to newest. Lines join recorded samples, not verified roads. Gaps over 2 minutes or implausible jumps are not connected. Playback advances one sample per second, not at real travel speed.</p>
  {samples.length!==points.length&&<p className="text-xs text-amber-800">{samples.length-points.length} invalid sample(s) omitted from the preview; inspect the table for recorded values.</p>}
  <Button variant="outline" onClick={()=>setStreetMap(value=>!value)}>{streetMap?'Hide street map':'Open street map'}</Button>
  {streetMap&&<TrackingStreetMap points={points} index={index}/>}
  <svg viewBox="0 0 600 380" className="max-h-80 w-full rounded-lg bg-slate-50" role="img" aria-label={`Coordinate preview, sample ${index+1} of ${points.length}`}>
   <text x="20" y="25" fill="#64748b" fontSize="13">North ↑ · coordinate preview</text>
   {segments.map((segment,i)=><polyline key={i} points={segment.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="3"/>)}
   {points.slice(0,index+1).map((point,i)=><circle key={`${point.id}:${i}`} cx={point.x} cy={point.y} r="4" fill="#64748b"/>)}
   <circle cx={current.x} cy={current.y} r="9" fill="#059669" stroke="white" strokeWidth="3"/>
  </svg>
  <p className="text-sm" aria-live="off">Sample {index+1} of {points.length} · {stamp(current.recorded_at)}<br/>Latitude {current.latitude}, longitude {current.longitude}</p>
  {current.gap&&<p className="text-sm text-amber-800">Recording gap or location jump before this sample. The intervening path is unknown.</p>}
  <label className="block text-sm">Recorded sample<Input aria-label="Recorded sample" className="mt-2 block w-full" type="range" min={0} max={points.length-1} value={index} disabled={points.length<2} onChange={e=>move(Number(e.target.value))}/></label>
  <div className="flex flex-wrap gap-2">
   <Button variant="outline" onClick={()=>move(0)} disabled={index===0&&!playing}><SkipBack size={16}/>Restart</Button>
   <Button variant="outline" onClick={()=>move(index-1)} disabled={index<=0}><ChevronLeft size={16}/>Previous sample</Button>
   <Button onClick={()=>{if(!playing&&index>=points.length-1)setIndex(0);setPlaying(value=>!value);}} disabled={points.length<2}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pause playback':'Play samples'}</Button>
   <Button variant="outline" onClick={()=>move(index+1)} disabled={index>=points.length-1}><ChevronRight size={16}/>Next sample</Button>
  </div>
 </section>;
}
